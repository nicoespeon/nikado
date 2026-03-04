import { create } from "zustand";
import { needsRevalidation, type LicenseGateway } from "../model/license";

export type LicenseState =
	| { status: "inactive" }
	| { status: "activating" }
	| { status: "active"; licenseKey: string; validatedAt: number }
	| { status: "error"; errorMessage: string };

type LicenseStore = {
	license: LicenseState;
	activateLicense(key: string): Promise<boolean>;
	removeLicense(): void;
	revalidateIfNeeded(): Promise<void>;
};

const STORAGE_KEY = "nikado-license";

function loadFromStorage(): { licenseKey: string; validatedAt: number } | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;

		const parsed = JSON.parse(raw) as {
			licenseKey?: string;
			validatedAt?: number;
		};
		if (
			typeof parsed.licenseKey === "string" &&
			typeof parsed.validatedAt === "number"
		) {
			return { licenseKey: parsed.licenseKey, validatedAt: parsed.validatedAt };
		}
	} catch {
		// Corrupted data, ignore
	}
	return null;
}

function saveToStorage(licenseKey: string, validatedAt: number) {
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ licenseKey, validatedAt }),
	);
}

function clearStorage() {
	localStorage.removeItem(STORAGE_KEY);
}

let gateway: LicenseGateway = {
	validateLicense() {
		return Promise.resolve({ valid: false });
	},
};

export function configureLicenseGateway(g: LicenseGateway) {
	gateway = g;
}

function createInitialLicense(): LicenseState {
	const stored = loadFromStorage();
	if (stored) {
		return {
			status: "active",
			licenseKey: stored.licenseKey,
			validatedAt: stored.validatedAt,
		};
	}
	return { status: "inactive" };
}

export const useLicenseStore = create<LicenseStore>((set, get) => ({
	license: createInitialLicense(),

	async activateLicense(key) {
		set({ license: { status: "activating" } });
		try {
			const result = await gateway.validateLicense(key);
			if (result.valid) {
				const validatedAt = Date.now();
				saveToStorage(key, validatedAt);
				set({ license: { status: "active", licenseKey: key, validatedAt } });
				return true;
			}

			set({
				license: { status: "error", errorMessage: "Invalid license key." },
			});
			return false;
		} catch {
			set({
				license: {
					status: "error",
					errorMessage: "Could not reach the license server. Try again later.",
				},
			});
			return false;
		}
	},

	removeLicense() {
		clearStorage();
		set({ license: { status: "inactive" } });
	},

	async revalidateIfNeeded() {
		const { license } = get();
		if (license.status !== "active") return;
		if (!needsRevalidation(license.validatedAt)) return;

		try {
			const result = await gateway.validateLicense(license.licenseKey);
			if (result.valid) {
				const now = Date.now();
				saveToStorage(license.licenseKey, now);
				set({
					license: {
						status: "active",
						licenseKey: license.licenseKey,
						validatedAt: now,
					},
				});
			} else {
				clearStorage();
				set({ license: { status: "inactive" } });
			}
		} catch {
			// Network error during revalidation: keep the cached license
		}
	},
}));

export function resetLicenseStore() {
	clearStorage();
	useLicenseStore.setState({ license: { status: "inactive" } });
}

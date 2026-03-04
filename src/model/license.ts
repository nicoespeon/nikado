export type LicenseGateway = {
	validateLicense(key: string): Promise<{ valid: boolean }>;
};

const REVALIDATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function needsRevalidation(validatedAt: number, now = Date.now()) {
	return now - validatedAt > REVALIDATION_INTERVAL_MS;
}

import { useEffect, useRef, useState } from "react";
import { useLicenseStore } from "../store/license-store";

type LicenseModalProps = {
	onClose: () => void;
	purchaseUrl: string;
};

const FOCUSABLE_SELECTOR =
	'a[href], button, input, [tabindex]:not([tabindex="-1"])';

function LicenseModal({ onClose, purchaseUrl }: LicenseModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);
	const [keyInput, setKeyInput] = useState("");
	const license = useLicenseStore((s) => s.license);
	useEffect(() => {
		closeRef.current?.focus();
	}, []);

	function trapFocus(e: React.KeyboardEvent) {
		if (e.key !== "Tab") return;

		const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
		if (!focusable || focusable.length === 0) return;

		const first = focusable[0] as HTMLElement;
		const last = focusable[focusable.length - 1] as HTMLElement;

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	function handleActivate(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const trimmed = keyInput.trim();
		if (!trimmed) return;
		void useLicenseStore.getState().activateLicense(trimmed);
	}

	function handleRemove() {
		useLicenseStore.getState().removeLicense();
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<dialog
				ref={dialogRef}
				open
				aria-label="Nikado Pro"
				onKeyDown={trapFocus}
				className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl p-0 overflow-hidden mx-4"
			>
				<div className="flex items-center justify-between px-5 pt-4 pb-2">
					<h2 className="text-lg font-semibold">Nikado Pro</h2>
					<button
						ref={closeRef}
						type="button"
						aria-label="Close"
						onClick={onClose}
						className="flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer"
					>
						&#x2715;
					</button>
				</div>

				<div className="px-5 pb-5">
					{license.status === "active" ? (
						<ActiveLicenseView
							licenseKey={license.licenseKey}
							onRemove={handleRemove}
						/>
					) : (
						<ActivationForm
							keyInput={keyInput}
							onKeyInputChange={setKeyInput}
							onSubmit={handleActivate}
							isActivating={license.status === "activating"}
							errorMessage={
								license.status === "error" ? license.errorMessage : null
							}
							purchaseUrl={purchaseUrl}
						/>
					)}
				</div>
			</dialog>
		</div>
	);
}

function ActiveLicenseView({
	licenseKey,
	onRemove,
}: {
	licenseKey: string;
	onRemove: () => void;
}) {
	const maskedKey = licenseKey.slice(0, 8) + "..." + licenseKey.slice(-4);

	return (
		<div className="flex flex-col items-center text-center py-2">
			<div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-green-600 dark:text-green-400"
				>
					<path d="M20 6 9 17l-5-5" />
				</svg>
			</div>
			<p className="font-medium text-green-600 dark:text-green-400 mb-1">
				License active
			</p>
			<p className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full mb-4">
				{maskedKey}
			</p>
			<button
				type="button"
				onClick={onRemove}
				className="px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
			>
				Remove license
			</button>
		</div>
	);
}

function ActivationForm({
	keyInput,
	onKeyInputChange,
	onSubmit,
	isActivating,
	errorMessage,
	purchaseUrl,
}: {
	keyInput: string;
	onKeyInputChange: (value: string) => void;
	onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
	isActivating: boolean;
	errorMessage: string | null;
	purchaseUrl: string;
}) {
	return (
		<>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
				Support Nikado's development with a lifetime{" "}
				<strong className="text-blue-500">Pro</strong> license!
			</p>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
				With a Pro license, you can save multiple graphs locally. No need to
				keep many tabs open to switch between projects.
			</p>

			<form onSubmit={onSubmit} className="space-y-3">
				<div>
					<label
						htmlFor="license-key"
						className="block text-sm font-medium mb-1"
					>
						License key
					</label>
					<input
						id="license-key"
						type="text"
						value={keyInput}
						onChange={(e) => {
							onKeyInputChange(e.target.value);
						}}
						placeholder="Enter your license key"
						disabled={isActivating}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
					/>
				</div>

				{errorMessage && (
					<p role="alert" className="text-sm text-red-500 dark:text-red-400">
						{errorMessage}
					</p>
				)}

				<button
					type="submit"
					disabled={isActivating || keyInput.trim().length === 0}
					className="w-full px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					{isActivating ? "Activating..." : "Activate License"}
				</button>
			</form>

			<p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
				Don't have a license?{" "}
				<a
					href={purchaseUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-500 hover:underline"
				>
					Get one here!
				</a>
			</p>
		</>
	);
}

export { LicenseModal };

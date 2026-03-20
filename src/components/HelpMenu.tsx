import { useEffect, useRef } from "react";

type HelpMenuProps = {
	onClose: () => void;
	variant?: "desktop" | "mobile";
};

type ShortcutCategory = {
	label: string;
	shortcuts: readonly (readonly [string, string])[];
};

const SHORTCUT_CATEGORIES: readonly ShortcutCategory[] = [
	{
		label: "Tasks",
		shortcuts: [
			["Space", "Create goal / edit label"],
			["Tab", "Create sub-task"],
			["Enter", "Create sibling"],
			["e / F2", "Edit label"],
			["Escape", "Cancel editing"],
			["d", "Toggle done"],
			["Delete / Backspace", "Delete task"],
			["Shift + Delete / Backspace", "Delete task (keep children)"],
			["Shift + Tab", "Insert parent"],
			["m", "Move task to new parent"],
			["Alt + \u2191 / \u2193", "Reorder sibling"],
		],
	},
	{
		label: "Navigation",
		shortcuts: [
			["\u2190", "Collapse / navigate to parent"],
			["\u2192", "Expand / navigate to first child"],
			["\u2191 / \u2193", "Navigate between siblings"],
			["h", "Toggle collapse/expand"],
			["[ / ]", "Collapse / Expand"],
		],
	},
	{
		label: "View",
		shortcuts: [
			["+ / -", "Zoom in / out"],
			["0", "Fit view"],
			["t", "Cycle theme"],
		],
	},
	{
		label: "Actions",
		shortcuts: [
			["\u2318/Ctrl + Z", "Undo"],
			["\u2318/Ctrl + Shift + Z", "Redo"],
			["r", "Reset"],
			["s", "Share (copy URL)"],
			["c", "Copy as text"],
			["x", "Export as image"],
			["p", "Nikado Pro"],
			["l", "Saved graphs (Pro)"],
			["n", "New graph (Pro)"],
			["?", "Toggle help"],
			["g", "Open GitHub repo"],
		],
	},
];

const FOCUSABLE_SELECTOR = 'a[href], button, [tabindex]:not([tabindex="-1"])';

function HelpMenu({ onClose, variant = "desktop" }: HelpMenuProps) {
	const isMobile = variant === "mobile";
	const closeRef = useRef<HTMLButtonElement>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);

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
				aria-label="How to use Nikado"
				onKeyDown={trapFocus}
				className={`relative w-full max-h-[80vh] rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl p-0 overflow-hidden ${isMobile ? "mx-4 max-w-[calc(100vw-2rem)]" : "max-w-lg"}`}
			>
				<div className="flex items-center justify-between px-5 pt-4 pb-2">
					<h2
						className={
							isMobile ? "text-xl font-semibold" : "text-lg font-semibold"
						}
					>
						How to use Nikado
					</h2>
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

				<div className="overflow-y-auto px-5 pb-5 max-h-[calc(80vh-3.5rem)]">
					{isMobile ? <MobileContent /> : <DesktopContent />}
				</div>
			</dialog>
		</div>
	);
}

function MobileContent() {
	return (
		<>
			<p className="text-base text-gray-600 dark:text-gray-400 mb-4">
				Use{" "}
				<a
					href="https://mikadomethod.info/"
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-500 hover:underline"
				>
					the Mikado Method
				</a>{" "}
				to break big changes into small, safe steps.
			</p>
			<ul className="text-base space-y-3 text-gray-700 dark:text-gray-300 mb-6">
				<li>
					🎯 <strong>Set your goal.</strong> The big change you want to make.
				</li>
				<li>
					🧩 <strong>Break it down.</strong> Add sub-tasks as you discover them.
				</li>
				<li>
					🍃 <strong>Work from the leaves.</strong> Mark them done, then move
					up.
				</li>
				<li>
					⏱️ <strong>Timebox.</strong> ~15 min per task. Can{"'"}t finish? Break
					it down further.
				</li>
			</ul>

			<h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
				Interesting Actions
			</h3>
			<ul className="text-base space-y-3 text-gray-700 dark:text-gray-300 mb-6">
				<li>
					<strong>Long-press</strong> a task for more actions (reorder, etc.)
				</li>
				<li>
					<strong>Share</strong> copies the URL to your clipboard, so others can
					see your graph
				</li>
				<li>
					<strong>Copy</strong> exports the graph as a text checklist
				</li>
				<li>
					<strong>Reset</strong> clears everything and starts over
				</li>
			</ul>

			<p className="text-sm text-gray-400 dark:text-gray-500">
				Made by{" "}
				<a
					href="https://bsky.app/profile/nicoespeon.com"
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-500 hover:underline"
				>
					Nicolas Carlo
				</a>
				<br />I wrote about how to best use this tool on{" "}
				<a
					href="https://understandlegacycode.com/blog/a-process-to-do-safe-changes-in-a-complex-codebase"
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-500 hover:underline"
				>
					my blog
				</a>
			</p>
		</>
	);
}

function DesktopContent() {
	return (
		<>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
				Stuck on a big change with no end in sight? <em>The Mikado Method</em>{" "}
				helps you break unknown problems down so you can make steady progress
				without breaking things!
			</p>
			<ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300 mb-6">
				<li>
					🎯 <strong>Set your goal.</strong> The big change you want to make.
				</li>
				<li>
					🧩 <strong>Break it down.</strong> Press Tab to add sub-tasks. You don
					{"'"}t need to figure it all out upfront. Just write what you know so
					far.
				</li>
				<li>
					🍃 <strong>Work from the leaves.</strong> Start with tasks that have
					no children. Mark them done, then move up.
				</li>
				<li>
					⏱️ <strong>Timebox your work.</strong> Give yourself ~15 min per task.
					If you can{"'"}t finish: pause to think. Break it into smaller tasks,
					revert your changes, and pick a new leaf.
				</li>
				<li>
					🔗 <strong>Share your progress.</strong> Simply copy the URL, it
					contains your graph.
				</li>
				<li className="pt-1 text-xs text-gray-500 dark:text-gray-400">
					New to the Mikado Method?{" "}
					<a
						href="https://understandlegacycode.com/blog/a-process-to-do-safe-changes-in-a-complex-codebase"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 hover:underline"
					>
						Read my intro
					</a>{" "}
					or check out the{" "}
					<a
						href="https://mikadomethod.info/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 hover:underline"
					>
						book
					</a>
					.
				</li>
			</ul>

			<h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-2 mb-2">
				Keyboard shortcuts
			</h3>
			{SHORTCUT_CATEGORIES.map((category) => (
				<div key={category.label} className="mb-4">
					<h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
						{category.label}
					</h4>
					<table className="w-full text-sm">
						<tbody>
							{category.shortcuts.map(([key, action]) => (
								<tr
									key={key}
									className="border-b border-gray-100 dark:border-gray-700"
								>
									<td className="py-1.5 pr-4 w-40 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
										{key}
									</td>
									<td className="py-1.5">{action}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			))}

			<div className="mt-6 text-xs text-gray-400 dark:text-gray-500">
				<p className="mb-2">
					Built with{" "}
					<a
						href="https://reactflow.dev"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 hover:underline"
					>
						React Flow
					</a>
					. Made with 💜 in Canada 🇨🇦
				</p>
				<p
					className="italic text-sm text-gray-500 dark:text-gray-400"
					style={{ fontFamily: "'Patrick Hand', cursive" }}
				>
					− Nicolas Carlo
				</p>
				<div className="flex items-center gap-2 mt-1">
					<a
						href="https://understandlegacycode.com"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 hover:underline"
					>
						Blog
					</a>
					<span>·</span>
					<a
						href="https://bsky.app/profile/nicoespeon.com"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 hover:underline"
					>
						Bluesky
					</a>
					<span>·</span>
					<a
						href="https://www.linkedin.com/in/nicolas-carlo-095b243b/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 hover:underline"
					>
						LinkedIn
					</a>
					<span>·</span>
					<a
						href="https://github.com/nicoespeon"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 hover:underline"
					>
						GitHub
					</a>
				</div>
			</div>
		</>
	);
}

export { HelpMenu };

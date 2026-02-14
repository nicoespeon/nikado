import { toPng } from "html-to-image";

export function deriveFilename(
	goalLabel: string | undefined,
	now = new Date(),
) {
	const date = now.toISOString().slice(0, 10);
	const fallback = `nikado-graph-${date}.png`;

	if (!goalLabel) return fallback;

	const sanitized = goalLabel
		.replace(/[<>:"/\\|?*]/g, "")
		.replace(/\s+/g, "-")
		.toLowerCase()
		.slice(0, 80);

	return sanitized ? `${sanitized}-${date}.png` : fallback;
}

type ExportOptions = {
	fitView: (options?: { padding?: number }) => Promise<boolean>;
	goalLabel?: string;
};

export async function exportGraphAsImage({
	fitView,
	goalLabel,
}: ExportOptions) {
	const container = document.querySelector<HTMLElement>(".react-flow");
	const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
	if (!container || !viewport) return;

	// Fit all nodes in view so everything is visible and measured.
	// Race with a timeout so the export proceeds even if fitView hangs.
	await Promise.race([
		fitView({ padding: 0.1 }).catch(() => undefined),
		new Promise((resolve) => setTimeout(resolve, 500)),
	]);

	container.classList.add("exporting");

	// html-to-image renders edges in 0x0 SVGs with overflow:visible,
	// which it skips during cloning. Give them explicit dimensions and
	// inline stroke styles so they survive the foreignObject wrapping.
	const { width, height } = container.getBoundingClientRect();
	const edgePaths = viewport.querySelectorAll<SVGPathElement>(
		".react-flow__edge-path",
	);
	for (const path of edgePaths) {
		path.style.stroke = "#374151";
		path.style.strokeWidth = "1.5";
	}

	try {
		const dataUrl = await toPng(viewport, {
			backgroundColor: "#ffffff",
			width,
			height,
			style: {
				width: String(width) + "px",
				height: String(height) + "px",
			},
		});

		const link = document.createElement("a");
		link.download = deriveFilename(goalLabel);
		link.href = dataUrl;
		link.click();
	} finally {
		for (const path of edgePaths) {
			path.style.stroke = "";
			path.style.strokeWidth = "";
		}
		container.classList.remove("exporting");
	}
}

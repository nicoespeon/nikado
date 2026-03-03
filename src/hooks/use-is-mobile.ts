import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(
		() => window.matchMedia(MOBILE_QUERY).matches,
	);

	useEffect(() => {
		const mq = window.matchMedia(MOBILE_QUERY);
		function handleChange(e: MediaQueryListEvent) {
			setIsMobile(e.matches);
		}
		mq.addEventListener("change", handleChange);
		return () => {
			mq.removeEventListener("change", handleChange);
		};
	}, []);

	return isMobile;
}

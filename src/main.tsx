import React from "react";
import ReactDOM from "react-dom/client";
import { polarLicenseGateway } from "./adapters/polar-sh-license-gateway";
import { App } from "./App.tsx";
import { configureLicenseGateway } from "./store/license-store";
import "./index.css";

configureLicenseGateway(polarLicenseGateway);

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

import { useState } from "react";
import "./App.css";

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="App">
			<header className="App-header">
				<h1>Welcome to Nikado</h1>
				<p>A React + TypeScript application</p>
				<div className="card">
					<button onClick={() => setCount((count) => count + 1)}>
						count is {count}
					</button>
				</div>
			</header>
		</div>
	);
}

export default App;

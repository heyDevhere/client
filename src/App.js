import Home from './Home';
import './App.css';
import ParticlesComponent from './particles';
function App() {
  return (
    <div className="App" style={{ position: "relative", height: "100vh" }}>
      {/* ParticlesComponent will fill the screen and stay in the background */}
      <ParticlesComponent />
      <Home />
    </div>
  );
}

export default App;

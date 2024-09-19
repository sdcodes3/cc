import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import { Modal, Button } from "react-bootstrap";

function App() {
  const [source, setSource] = useState("");
  const [tokens, setTokens] = useState([]);
  const [ast, setAst] = useState([]);
  const [errors, setErrors] = useState([]);
  const [nasmCode, setNasmCode] = useState("");
  const [currentPhase, setCurrentPhase] = useState(0); // Track the current phase (1 to 5)
  const [modalInfo, setModalInfo] = useState({
    show: false,
    title: "",
    content: "",
  }); // Modal state

  const phases = ["Tokenize", "Parse", "Type Check", "Generate NASM Code"];

  const handleCompile = async () => {
    setCurrentPhase(1);
    // 1. Tokenize Phase
    const tokenizeResponse = await axios.post(
      "http://localhost:5000/tokenize",
      { source }
    );
    setTokens(tokenizeResponse.data.tokens);
    setTimeout(async () => {
      setCurrentPhase(2);
      // 2. Parse Phase
      const parseResponse = await axios.post("http://localhost:5000/parse", {
        tokens: tokenizeResponse.data.tokens,
      });
      setAst(parseResponse.data.ast);
      setTimeout(async () => {
        setCurrentPhase(3);
        // 3. Type Check Phase
        const typeCheckResponse = await axios.post(
          "http://localhost:5000/typecheck",
          { ast: parseResponse.data.ast }
        );
        setErrors(typeCheckResponse.data.errors);
        setTimeout(async () => {
          setCurrentPhase(4);
          // 4. Generate NASM Code Phase
          const generateResponse = await axios.post(
            "http://localhost:5000/generate",
            { ast: parseResponse.data.ast }
          );
          setNasmCode(generateResponse.data.nasm_code);
          setCurrentPhase(5); // All phases completed
        }, 1000); // Delay between phases for animation
      }, 1000);
    }, 1000);
  };

  // Handle modal opening
  const handleOpenModal = (title, content) => {
    setModalInfo({ show: true, title, content });
  };

  // Handle modal closing
  const handleCloseModal = () => {
    setModalInfo({ show: false, title: "", content: "" });
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Simple Interpreter</h1>

      {/* Input source code */}
      <textarea
        className="form-control"
        rows="10"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="Enter your code here..."
      />

      {/* Linked List Style Phases */}
      <div className="phases text-center mt-4">
        {phases.map((phase, index) => (
          <div key={index} className="phase-block">
            <div
              className={`block ${currentPhase > index ? "completed" : ""}`}
              onClick={() => {
                if (currentPhase > index) {
                  const modalContent = getPhaseDetails(phase);
                  handleOpenModal(phase, modalContent);
                }
              }}
            >
              {phase}
            </div>
            {index < phases.length - 1 && (
              <div className={`arrow ${currentPhase > index ? "visible" : ""}`}>
                →
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compile Button */}
      <div className="text-center mt-3">
        <button
          className="btn btn-primary mx-2"
          onClick={handleCompile}
          disabled={currentPhase !== 0}
        >
          Compile
        </button>
      </div>

      {/* Bootstrap Modal for detailed view */}
      <Modal show={modalInfo.show} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{modalInfo.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre>{modalInfo.content}</pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );

  function getPhaseDetails(phase) {
    switch (phase) {
      case "Tokenize":
        return `Tokens: ${JSON.stringify(tokens, null, 2)}`;
      case "Parse":
        return `AST: ${JSON.stringify(ast, null, 2)}`;
      case "Type Check":
        return `Errors: ${JSON.stringify(errors, null, 2)}`;
      case "Generate NASM Code":
        return `NASM Code: ${nasmCode}`;
      default:
        return "";
    }
  }
}

export default App;

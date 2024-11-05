import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import { Modal, Button, Spinner } from "react-bootstrap";

function App() {
  const [source, setSource] = useState("");
  const [tokens, setTokens] = useState([]);
  const [ast, setAst] = useState([]);
  const [errors, setErrors] = useState([]);
  const [nasmCode, setNasmCode] = useState("");
  const [currentPhase, setCurrentPhase] = useState(0); // Track the current phase (1 to 5)
  const [loading, setLoading] = useState(false); // Track loading state
  const [modalInfo, setModalInfo] = useState({
    show: false,
    title: "",
    content: "",
  });

  const phases = ["Tokenize", "Parse", "Type Check", "Generate NASM Code"];

  const handleCompile = async () => {
    setLoading(true);
    setCurrentPhase(1); // Start with Tokenize phase

    try {
      const tokenizeResponse = await axios.post(
        "http://localhost:5000/tokenize",
        { source }
      );
      setTokens(tokenizeResponse?.data?.tokens);
    } catch (error) {
      handlePhaseError("Tokenize", error);
    }
  };

  useEffect(() => {
    if (currentPhase === 1 && tokens.length > 0) {
      // Phase 2: Parse
      const parseTokens = async () => {
        setCurrentPhase(2);
        try {
          const parseResponse = await axios.post(
            "http://localhost:5000/parse",
            { tokens }
          );
          setAst(parseResponse.data.ast);
        } catch (error) {
          handlePhaseError("Parse", error);
        }
      };
      parseTokens();
    }
  }, [tokens]);

  useEffect(() => {
    if (currentPhase === 2 && ast.length > 0) {
      // Phase 3: Type Check
      const checkTypes = async () => {
        setCurrentPhase(3);
        try {
          const typeCheckResponse = await axios.post(
            "http://localhost:5000/typecheck",
            { ast }
          );
          setErrors(typeCheckResponse.data.errors);

          // Display type check errors in the modal
          if (typeCheckResponse.data.errors.length > 0) {
            handleOpenModal(
              "Type Check Error",
              `Errors: ${JSON.stringify(
                typeCheckResponse.data.errors,
                null,
                2
              )}`
            );
            setLoading(false); // Stop loading if there are errors
            return; // Stop further processing
          }
        } catch (error) {
          handlePhaseError("Type Check", error);
        }
      };
      checkTypes();
    }
  }, [ast]);

  useEffect(() => {
    if (currentPhase === 3 && errors.length === 0) {
      // Phase 4: Generate NASM Code
      const generateCode = async () => {
        setCurrentPhase(4);
        try {
          const generateResponse = await axios.post(
            "http://localhost:5000/generate",
            { ast }
          );
          setNasmCode(generateResponse.data.nasm_code);
          setCurrentPhase(5); // All phases completed
          setLoading(false); // Stop loading after successful completion
        } catch (error) {
          handlePhaseError("Generate NASM Code", error);
        }
      };
      generateCode();
    }
  }, [errors]);

  const handleReset = () => {
    setSource("");
    setTokens([]);
    setAst([]);
    setErrors([]);
    setNasmCode("");
    setCurrentPhase(0);
    setLoading(false); // Ensure loading is also reset
  };

  const handlePhaseError = (phase, error) => {
    const errorMessage =
      error.response?.data?.error || error.message || "Unknown error";
    setModalInfo({
      show: true,
      title: `${phase} Error`,
      content: `An error occurred in the ${phase} phase:\n\n${errorMessage}`,
    });
    setCurrentPhase(0); // Reset phase on error
    setLoading(false); // Stop loading if error
  };

  const handleOpenModal = (title, content) => {
    setModalInfo({ show: true, title, content });
  };

  const handleCloseModal = () => {
    setModalInfo({ show: false, title: "", content: "" });
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">CC Innovative</h1>

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

      {/* Compile and Reset Buttons */}
      <div className="text-center mt-3">
        <button
          className="btn btn-primary mx-2"
          onClick={handleCompile}
          disabled={loading || currentPhase !== 0}
        >
          {loading ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "Compile"
          )}
        </button>
        <button
          className="btn btn-secondary mx-2"
          onClick={handleReset}
          disabled={loading}
        >
          Reset
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

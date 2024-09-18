import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [source, setSource] = useState("");
  const [tokens, setTokens] = useState([]);
  const [ast, setAst] = useState([]);
  const [errors, setErrors] = useState([]);
  const [nasmCode, setNasmCode] = useState("");

  const handleTokenize = async () => {
    const response = await axios.post("http://localhost:5000/tokenize", {
      source,
    });
    setTokens(response.data.tokens);
  };

  const handleParse = async () => {
    const response = await axios.post("http://localhost:5000/parse", {
      tokens,
    });
    setAst(response.data.ast);
  };

  const handleTypeCheck = async () => {
    const response = await axios.post("http://localhost:5000/typecheck", {
      ast,
    });
    setErrors(response.data.errors);
  };

  const handleGenerate = async () => {
    const response = await axios.post("http://localhost:5000/generate", {
      ast,
    });
    setNasmCode(response.data.nasm_code);
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Simple Interpreter</h1>
      <textarea
        className="form-control"
        rows="10"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="Enter your code here..."
      />
      <div className="text-center mt-3">
        <button className="btn btn-primary mx-2" onClick={handleTokenize}>
          Tokenize
        </button>
        <button className="btn btn-secondary mx-2" onClick={handleParse}>
          Parse
        </button>
        <button className="btn btn-warning mx-2" onClick={handleTypeCheck}>
          Type Check
        </button>
        <button className="btn btn-success mx-2" onClick={handleGenerate}>
          Generate NASM Code
        </button>
      </div>

      <h2 className="mt-4">Tokens</h2>
      <pre className="bg-light p-3">{JSON.stringify(tokens, null, 2)}</pre>

      <h2 className="mt-4">AST</h2>
      <pre className="bg-light p-3">{JSON.stringify(ast, null, 2)}</pre>

      <h2 className="mt-4">Type Errors</h2>
      <pre className="bg-light p-3">{JSON.stringify(errors, null, 2)}</pre>

      <h2 className="mt-4">Generated NASM Code</h2>
      <pre className="bg-light p-3">{nasmCode}</pre>
    </div>
  );
}

export default App;

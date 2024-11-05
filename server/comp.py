from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)

# Lexer
class Lexer:
    def __init__(self, source):
        self.tokens = []
        self.tokenize(source)

    def tokenize(self, source):
        token_specification = [
            ('NUMBER',   r'-?\d+(\.\d+)?'),          # Integer
            ('PRINT',    r'PRINT'),        # PRINT keyword
            ('PUSH',     r'PUSH'),         # PUSH keyword
            ('ADD',      r'ADD'),          # ADD keyword
            ('HALT',     r'HALT'),         # HALT keyword
            ('STRING',   r'"[^"]*"'),      # String literal
            ('SKIP',     r'[ \t]+'),       # Skip spaces and tabs
            ('NEWLINE',  r'\n'),           # Line endings
            ('MISMATCH', r'.'),            # Any other character
        ]
        
        tok_regex = '|'.join(f'(?P<{pair[0]}>{pair[1]})' for pair in token_specification)
        for mo in re.finditer(tok_regex, source):
            kind = mo.lastgroup
            value = mo.group()
            if kind == 'NUMBER':
                value = int(value) if '.' not in value else float(value)
            elif kind == 'STRING':
                value = value[1:-1]
            elif kind == 'SKIP':
                continue
            elif kind == 'MISMATCH':
                raise RuntimeError(f'Unexpected token "{value}"')
            self.tokens.append((kind, value))
        return self.tokens

# AST Nodes
class ASTNode:
    pass

class PushNode(ASTNode):
    def __init__(self, value):
        self.value = value

    def to_dict(self):
        return {"type": "PushNode", "value": self.value}

class AddNode(ASTNode):
    def to_dict(self):
        return {"type": "AddNode"}

class PrintNode(ASTNode):
    def __init__(self, message):
        self.message = message

    def to_dict(self):
        return {"type": "PrintNode", "message": self.message}

class HaltNode(ASTNode):
    def to_dict(self):
        return {"type": "HaltNode"}

# Parser
class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.current_token_index = 0

    def parse(self):
        nodes = []
        while self.current_token_index < len(self.tokens):
            token_type, token_value = self.tokens[self.current_token_index]
            if token_type == 'PUSH':
                self.current_token_index += 1
                value = self.tokens[self.current_token_index][1]
                nodes.append(PushNode(value))
            elif token_type == 'ADD':
                nodes.append(AddNode())
            elif token_type == 'PRINT':
                self.current_token_index += 1
                message = self.tokens[self.current_token_index][1]
                nodes.append(PrintNode(message))
            elif token_type == 'HALT':
                nodes.append(HaltNode())
            self.current_token_index += 1
        return nodes

# Type Checking
class TypeChecker:
    def __init__(self, ast):
        self.ast = ast
        self.errors = []

    def check(self):
        stack_depth = 0  # To keep track of stack depth for operations

        for node in self.ast:
            if type(node) == PushNode:
                if not (isinstance(node.value, int) or isinstance(node.value, float)):
                    self.errors.append("PUSH value must be an integer.")
                stack_depth += 1
            elif type(node) == AddNode:
                if stack_depth < 2:
                    self.errors.append("ADD requires at least two values on the stack.")
                else:
                    stack_depth -= 1
            elif type(node) == PrintNode:
                if not isinstance(node.message, str):
                    self.errors.append("PRINT message must be a string.")
            elif type(node) == HaltNode:
                pass
            else:
                self.errors.append(f"Unknown node type: {type(node).__name__}")

        return self.errors

# Code Generation
class CodeGenerator:
    def __init__(self, ast):
        self.ast = ast
        self.code = []

    def generate(self):
        self.code.append("section .data")
        self.code.append('hello db "Hello, World",0')
        self.code.append("section .text")
        self.code.append("global _start")
        self.code.append("_start:")
        for node in self.ast:
            if type(node) == PushNode:
                self.code.append(f"    push {node.value}")
            elif type(node) == AddNode:
                self.code.append("    pop rax")
                self.code.append("    pop rbx")
                self.code.append("    add rax, rbx")
                self.code.append("    push rax")
            elif type(node) == PrintNode:
                self.code.append("    mov rax, 1")
                self.code.append("    mov rdi, 1")
                self.code.append("    mov rsi, hello")
                self.code.append("    mov rdx, 13")
                self.code.append("    syscall")
            elif type(node) == HaltNode:
                self.code.append("    mov rax, 60")
                self.code.append("    xor rdi, rdi")
                self.code.append("    syscall")

        return '\n'.join(self.code)

@app.route('/tokenize', methods=['POST'])
def tokenize():
    try:
        source_code = request.json.get('source', '')
        lexer = Lexer(source_code)
        tokens = lexer.tokens
        return jsonify(tokens=tokens)
    except RuntimeError as e:
        return jsonify(error=str(e)), 400

@app.route('/parse', methods=['POST'])
def parse():
    try:
        tokens = request.json.get('tokens', [])
        print("Received tokens for parsing:", tokens)  # Debugging line
        parser = Parser(tokens)
        ast = parser.parse()
        print("Generated AST:", ast)  # Debugging line
        return jsonify(ast=[node.to_dict() for node in ast])  # Convert nodes to dicts
    except Exception as e:
        print(f"Error during parsing: {str(e)}")  # Log the error
        return jsonify(error="An error occurred during parsing"), 500

@app.route('/typecheck', methods=['POST'])
def typecheck():
    try:
        ast_data = request.json.get('ast', [])
        # Create the AST node instances from the received data
        ast = []
        for node_data in ast_data:
            if node_data['type'] == "PushNode":
                ast.append(PushNode(node_data['value']))
            elif node_data['type'] == "AddNode":
                ast.append(AddNode())
            elif node_data['type'] == "PrintNode":
                ast.append(PrintNode(node_data['message']))
            elif node_data['type'] == "HaltNode":
                ast.append(HaltNode())
            else:
                raise ValueError(f"Unknown node type: {node_data['type']}")

        type_checker = TypeChecker(ast)
        errors = type_checker.check()
        return jsonify(errors=errors)
    except Exception as e:
        print(f"Error during type checking: {str(e)}")  # Log the error
        return jsonify(error="An error occurred during type checking"), 500

@app.route('/generate', methods=['POST'])
def generate():
    ast_data = request.json.get('ast', [])
    # Create the AST node instances from the received data
    ast = []
    for node_data in ast_data:
        if node_data['type'] == "PushNode":
            ast.append(PushNode(node_data['value']))
        elif node_data['type'] == "AddNode":
            ast.append(AddNode())
        elif node_data['type'] == "PrintNode":
            ast.append(PrintNode(node_data['message']))
        elif node_data['type'] == "HaltNode":
            ast.append(HaltNode())
        else:
            raise ValueError(f"Unknown node type: {node_data['type']}")

    code_generator = CodeGenerator(ast)
    nasm_code = code_generator.generate()
    return jsonify(nasm_code=nasm_code)

if __name__ == '__main__':
    app.run(debug=True)

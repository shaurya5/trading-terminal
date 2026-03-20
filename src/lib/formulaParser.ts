/**
 * Custom Formula Indicator Parser & Evaluator
 *
 * A safe expression-based formula language for creating custom chart indicators.
 * Supports price variables (open, high, low, close, volume, hl2, hlc3, ohlc4),
 * built-in functions (sma, ema, highest, lowest, abs, max, min, sqrt),
 * arithmetic operators (+, -, *, /), parentheses, and number literals.
 *
 * SAFETY: No eval(), no Function constructor, no access to window/document/global.
 * Only pure math on candle data.
 */

import { CandleData } from '@/types';
import { calculateSMA, calculateEMA, TimeValue } from '@/lib/indicators';

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

export type TokenType = 'number' | 'identifier' | 'operator' | 'lparen' | 'rparen' | 'comma' | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ---------------------------------------------------------------------------
// AST node types
// ---------------------------------------------------------------------------

export type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; operand: ASTNode }
  | { type: 'call'; name: string; args: ASTNode[] };

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface FormulaResult {
  values: TimeValue[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Known variables and functions
// ---------------------------------------------------------------------------

const KNOWN_VARIABLES = new Set([
  'open', 'high', 'low', 'close', 'volume',
  'hl2', 'hlc3', 'ohlc4',
]);

const KNOWN_FUNCTIONS = new Set([
  'sma', 'ema', 'highest', 'lowest',
  'abs', 'max', 'min', 'sqrt',
]);

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

export function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const ch = formula[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number literal (including decimals)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < formula.length && /[0-9]/.test(formula[i + 1]))) {
      const start = i;
      while (i < formula.length && /[0-9]/.test(formula[i])) i++;
      if (i < formula.length && formula[i] === '.') {
        i++;
        while (i < formula.length && /[0-9]/.test(formula[i])) i++;
      }
      tokens.push({ type: 'number', value: formula.slice(start, i), position: start });
      continue;
    }

    // Identifier (variable or function name)
    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) i++;
      tokens.push({ type: 'identifier', value: formula.slice(start, i), position: start });
      continue;
    }

    // Operators
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch, position: i });
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(', position: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')', position: i });
      i++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',', position: i });
      i++;
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }

  tokens.push({ type: 'eof', value: '', position: i });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser — recursive descent
// Produces an AST from tokens.
//
// Grammar:
//   expression  = term (('+' | '-') term)*
//   term        = unary (('*' | '/') unary)*
//   unary       = ('-' | '+') unary | primary
//   primary     = NUMBER | IDENTIFIER | IDENTIFIER '(' args ')' | '(' expression ')'
//   args        = expression (',' expression)*
// ---------------------------------------------------------------------------

export function parse(tokens: Token[]): ASTNode {
  let pos = 0;

  function peek(): Token {
    return tokens[pos];
  }

  function advance(): Token {
    return tokens[pos++];
  }

  function expect(type: TokenType, valueCheck?: string): Token {
    const tok = peek();
    if (tok.type !== type || (valueCheck !== undefined && tok.value !== valueCheck)) {
      throw new Error(
        `Expected ${type}${valueCheck ? ` '${valueCheck}'` : ''} at position ${tok.position}, got ${tok.type} '${tok.value}'`
      );
    }
    return advance();
  }

  function parseExpression(): ASTNode {
    let left = parseTerm();

    while (peek().type === 'operator' && (peek().value === '+' || peek().value === '-')) {
      const op = advance().value;
      const right = parseTerm();
      left = { type: 'binary', op, left, right };
    }

    return left;
  }

  function parseTerm(): ASTNode {
    let left = parseUnary();

    while (peek().type === 'operator' && (peek().value === '*' || peek().value === '/')) {
      const op = advance().value;
      const right = parseUnary();
      left = { type: 'binary', op, left, right };
    }

    return left;
  }

  function parseUnary(): ASTNode {
    if (peek().type === 'operator' && (peek().value === '-' || peek().value === '+')) {
      const op = advance().value;
      const operand = parseUnary();
      if (op === '+') return operand; // unary + is a no-op
      return { type: 'unary', op, operand };
    }
    return parsePrimary();
  }

  function parsePrimary(): ASTNode {
    const tok = peek();

    // Number literal
    if (tok.type === 'number') {
      advance();
      return { type: 'number', value: parseFloat(tok.value) };
    }

    // Identifier (variable or function call)
    if (tok.type === 'identifier') {
      advance();
      const name = tok.value.toLowerCase();

      // Function call: identifier followed by '('
      if (peek().type === 'lparen' && KNOWN_FUNCTIONS.has(name)) {
        advance(); // consume '('
        const args: ASTNode[] = [];
        if (peek().type !== 'rparen') {
          args.push(parseExpression());
          while (peek().type === 'comma') {
            advance(); // consume ','
            args.push(parseExpression());
          }
        }
        expect('rparen');
        return { type: 'call', name, args };
      }

      // Variable reference
      if (!KNOWN_VARIABLES.has(name)) {
        throw new Error(`Unknown variable '${tok.value}' at position ${tok.position}`);
      }
      return { type: 'variable', name };
    }

    // Parenthesized expression
    if (tok.type === 'lparen') {
      advance(); // consume '('
      const expr = parseExpression();
      expect('rparen');
      return expr;
    }

    throw new Error(`Unexpected token '${tok.value}' at position ${tok.position}`);
  }

  const ast = parseExpression();

  // Ensure we consumed all tokens (except eof)
  if (peek().type !== 'eof') {
    throw new Error(`Unexpected token '${peek().value}' at position ${peek().position}`);
  }

  return ast;
}

// ---------------------------------------------------------------------------
// Validator — check that an AST is well-formed
// ---------------------------------------------------------------------------

export function validate(formula: string): { valid: boolean; error?: string } {
  try {
    const tokens = tokenize(formula);
    const ast = parse(tokens);
    validateAST(ast);
    return { valid: true };
  } catch (e: unknown) {
    return { valid: false, error: (e as Error).message };
  }
}

function validateAST(node: ASTNode): void {
  switch (node.type) {
    case 'number':
    case 'variable':
      return;
    case 'binary':
      validateAST(node.left);
      validateAST(node.right);
      return;
    case 'unary':
      validateAST(node.operand);
      return;
    case 'call': {
      const name = node.name;
      if (!KNOWN_FUNCTIONS.has(name)) {
        throw new Error(`Unknown function '${name}'`);
      }
      // Validate argument counts
      switch (name) {
        case 'sma':
        case 'ema':
        case 'highest':
        case 'lowest':
        case 'max':
        case 'min':
          if (node.args.length !== 2) {
            throw new Error(`Function '${name}' requires 2 arguments, got ${node.args.length}`);
          }
          break;
        case 'abs':
        case 'sqrt':
          if (node.args.length !== 1) {
            throw new Error(`Function '${name}' requires 1 argument, got ${node.args.length}`);
          }
          break;
      }
      // Validate that the period argument for sma/ema/highest/lowest is a constant number
      if (['sma', 'ema', 'highest', 'lowest'].includes(name)) {
        const periodArg = node.args[1];
        if (periodArg.type !== 'number') {
          throw new Error(`Function '${name}' requires a constant number as the second argument (period)`);
        }
        if (periodArg.value <= 0 || !Number.isInteger(periodArg.value)) {
          throw new Error(`Function '${name}' requires a positive integer period, got ${periodArg.value}`);
        }
      }
      for (const arg of node.args) {
        validateAST(arg);
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate a formula against candle data and return TimeValue[].
 *
 * The evaluator works bar-by-bar. For function calls like sma(close, 20),
 * it pre-computes the full array, then indexes into it per-bar.
 */
export function evaluateFormula(formula: string, data: CandleData[]): FormulaResult {
  if (data.length === 0) {
    return { values: [], error: undefined };
  }

  try {
    const tokens = tokenize(formula);
    const ast = parse(tokens);
    validateAST(ast);

    // Pre-compute variable arrays (bar-by-bar values for each variable)
    const varArrays: Record<string, number[]> = {
      open: data.map(d => d.open),
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      volume: data.map(d => d.volume),
      hl2: data.map(d => (d.high + d.low) / 2),
      hlc3: data.map(d => (d.high + d.low + d.close) / 3),
      ohlc4: data.map(d => (d.open + d.high + d.low + d.close) / 4),
    };

    // Pre-compute all function call results by walking the AST.
    // The cache maps a serialized key to the resulting number[].
    const fnCache = new Map<string, number[]>();

    function precomputeFunctions(node: ASTNode): void {
      switch (node.type) {
        case 'number':
        case 'variable':
          return;
        case 'binary':
          precomputeFunctions(node.left);
          precomputeFunctions(node.right);
          return;
        case 'unary':
          precomputeFunctions(node.operand);
          return;
        case 'call': {
          // Recurse into arguments first
          for (const arg of node.args) {
            precomputeFunctions(arg);
          }

          const name = node.name;
          if (['sma', 'ema', 'highest', 'lowest'].includes(name)) {
            const sourceNode = node.args[0];
            const periodNode = node.args[1] as { type: 'number'; value: number };
            const period = periodNode.value;

            // Evaluate the source bar-by-bar to get a number array
            const sourceArray = evaluateNodeArray(sourceNode, varArrays, fnCache, data.length);
            const key = makeFnCacheKey(name, sourceArray, period);

            if (!fnCache.has(key)) {
              const result = computeFunction(name, sourceArray, period, data);
              fnCache.set(key, result);
            }
          }
          return;
        }
      }
    }

    precomputeFunctions(ast);

    // Now evaluate bar-by-bar
    const resultArray = evaluateNodeArray(ast, varArrays, fnCache, data.length);

    // Build TimeValue[]
    const values: TimeValue[] = [];
    for (let i = 0; i < data.length; i++) {
      const v = resultArray[i];
      if (v !== null && v !== undefined && isFinite(v)) {
        values.push({ time: data[i].time, value: +v.toFixed(6) });
      }
    }

    return { values };
  } catch (e: unknown) {
    return { values: [], error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Evaluate a node to a full array (one value per bar). NaN for unavailable bars.
// ---------------------------------------------------------------------------

function evaluateNodeArray(
  node: ASTNode,
  varArrays: Record<string, number[]>,
  fnCache: Map<string, number[]>,
  length: number,
): number[] {
  switch (node.type) {
    case 'number': {
      return new Array(length).fill(node.value);
    }
    case 'variable': {
      const arr = varArrays[node.name];
      if (!arr) throw new Error(`Unknown variable '${node.name}'`);
      return arr;
    }
    case 'binary': {
      const left = evaluateNodeArray(node.left, varArrays, fnCache, length);
      const right = evaluateNodeArray(node.right, varArrays, fnCache, length);
      const result = new Array(length);
      for (let i = 0; i < length; i++) {
        const l = left[i];
        const r = right[i];
        if (isNaN(l) || isNaN(r)) {
          result[i] = NaN;
          continue;
        }
        switch (node.op) {
          case '+': result[i] = l + r; break;
          case '-': result[i] = l - r; break;
          case '*': result[i] = l * r; break;
          case '/': result[i] = r === 0 ? NaN : l / r; break;
          default: result[i] = NaN;
        }
      }
      return result;
    }
    case 'unary': {
      const operand = evaluateNodeArray(node.operand, varArrays, fnCache, length);
      if (node.op === '-') {
        return operand.map((v: number) => isNaN(v) ? NaN : -v);
      }
      return operand;
    }
    case 'call': {
      const name = node.name;

      // Window functions use the cache
      if (['sma', 'ema', 'highest', 'lowest'].includes(name)) {
        const sourceNode = node.args[0];
        const periodNode = node.args[1] as { type: 'number'; value: number };
        const period = periodNode.value;
        const sourceArray = evaluateNodeArray(sourceNode, varArrays, fnCache, length);
        const key = makeFnCacheKey(name, sourceArray, period);
        const cached = fnCache.get(key);
        if (cached) return cached;
        // Compute if not cached (shouldn't happen if precompute ran)
        const result = computeFunction(name, sourceArray, period, []);
        fnCache.set(key, result);
        return result;
      }

      // Scalar functions (abs, sqrt, max, min) — evaluated bar-by-bar
      switch (name) {
        case 'abs': {
          const arg = evaluateNodeArray(node.args[0], varArrays, fnCache, length);
          return arg.map((v: number) => isNaN(v) ? NaN : Math.abs(v));
        }
        case 'sqrt': {
          const arg = evaluateNodeArray(node.args[0], varArrays, fnCache, length);
          return arg.map((v: number) => isNaN(v) || v < 0 ? NaN : Math.sqrt(v));
        }
        case 'max': {
          const a = evaluateNodeArray(node.args[0], varArrays, fnCache, length);
          const b = evaluateNodeArray(node.args[1], varArrays, fnCache, length);
          const result = new Array(length);
          for (let i = 0; i < length; i++) {
            if (isNaN(a[i]) || isNaN(b[i])) { result[i] = NaN; continue; }
            result[i] = Math.max(a[i], b[i]);
          }
          return result;
        }
        case 'min': {
          const a = evaluateNodeArray(node.args[0], varArrays, fnCache, length);
          const b = evaluateNodeArray(node.args[1], varArrays, fnCache, length);
          const result = new Array(length);
          for (let i = 0; i < length; i++) {
            if (isNaN(a[i]) || isNaN(b[i])) { result[i] = NaN; continue; }
            result[i] = Math.min(a[i], b[i]);
          }
          return result;
        }
        default:
          throw new Error(`Unknown function '${name}'`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Compute window functions over a source array
// Returns array of same length with NaN for bars before the window is available.
// ---------------------------------------------------------------------------

function computeFunction(
  name: string,
  source: number[],
  period: number,
  data: CandleData[],
): number[] {
  const len = source.length;
  const result = new Array(len).fill(NaN);

  switch (name) {
    case 'sma': {
      // If the source is exactly the close array, we can use calculateSMA,
      // but for generality, we compute inline.
      for (let i = period - 1; i < len; i++) {
        let sum = 0;
        let valid = true;
        for (let j = 0; j < period; j++) {
          if (isNaN(source[i - j])) { valid = false; break; }
          sum += source[i - j];
        }
        if (valid) result[i] = sum / period;
      }
      break;
    }
    case 'ema': {
      const multiplier = 2 / (period + 1);
      // Initial EMA = SMA of first `period` values
      let sum = 0;
      let validStart = true;
      for (let i = 0; i < period && i < len; i++) {
        if (isNaN(source[i])) { validStart = false; break; }
        sum += source[i];
      }
      if (validStart && len >= period) {
        let ema = sum / period;
        result[period - 1] = ema;
        for (let i = period; i < len; i++) {
          if (isNaN(source[i])) break;
          ema = (source[i] - ema) * multiplier + ema;
          result[i] = ema;
        }
      }
      break;
    }
    case 'highest': {
      for (let i = period - 1; i < len; i++) {
        let max = -Infinity;
        let valid = true;
        for (let j = 0; j < period; j++) {
          if (isNaN(source[i - j])) { valid = false; break; }
          if (source[i - j] > max) max = source[i - j];
        }
        if (valid) result[i] = max;
      }
      break;
    }
    case 'lowest': {
      for (let i = period - 1; i < len; i++) {
        let min = Infinity;
        let valid = true;
        for (let j = 0; j < period; j++) {
          if (isNaN(source[i - j])) { valid = false; break; }
          if (source[i - j] < min) min = source[i - j];
        }
        if (valid) result[i] = min;
      }
      break;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cache key for window functions
// ---------------------------------------------------------------------------

function makeFnCacheKey(name: string, source: number[], period: number): string {
  // Use a hash-like approach: function name + period + first few and last few values
  // This is a practical heuristic; exact identity would require comparing entire arrays.
  const len = source.length;
  const sample = [
    source[0],
    source[Math.floor(len / 4)],
    source[Math.floor(len / 2)],
    source[Math.floor(len * 3 / 4)],
    source[len - 1],
    len,
  ].join(',');
  return `${name}:${period}:${sample}`;
}

// ---------------------------------------------------------------------------
// Example presets
// ---------------------------------------------------------------------------

export interface FormulaPreset {
  name: string;
  formula: string;
  description: string;
}

export const FORMULA_PRESETS: FormulaPreset[] = [
  {
    name: 'SMA Crossover',
    formula: 'sma(close, 20) - sma(close, 50)',
    description: 'Difference between 20 and 50 period SMA',
  },
  {
    name: '% From SMA',
    formula: '(close - sma(close, 20)) / sma(close, 20) * 100',
    description: 'Percentage deviation from 20-period SMA',
  },
  {
    name: 'Donchian Mid',
    formula: '(highest(high, 14) + lowest(low, 14)) / 2',
    description: 'Midline of 14-period Donchian Channel',
  },
  {
    name: 'Custom Stochastic',
    formula: '(close - lowest(low, 14)) / (highest(high, 14) - lowest(low, 14)) * 100',
    description: 'Custom stochastic oscillator (0-100)',
  },
];

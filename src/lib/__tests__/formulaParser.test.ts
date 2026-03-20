import { describe, it, expect } from 'vitest';
import {
  tokenize,
  parse,
  validate,
  evaluateFormula,
  ASTNode,
  Token,
  FORMULA_PRESETS,
} from '@/lib/formulaParser';
import { CandleData } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandles(closePrices: number[]): CandleData[] {
  return closePrices.map((close, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: close - 1,
    high: close + 2,
    low: close - 2,
    close,
    volume: 1000 * (i + 1),
  }));
}

function makeCandlesOHLCV(
  bars: { open: number; high: number; low: number; close: number; volume: number }[],
): CandleData[] {
  return bars.map((b, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    ...b,
  }));
}

// ---------------------------------------------------------------------------
// Tokenizer tests
// ---------------------------------------------------------------------------

describe('tokenize', () => {
  it('tokenizes a simple expression', () => {
    const tokens = tokenize('close + 10');
    expect(tokens.map(t => t.type)).toEqual(['identifier', 'operator', 'number', 'eof']);
    expect(tokens[0].value).toBe('close');
    expect(tokens[1].value).toBe('+');
    expect(tokens[2].value).toBe('10');
  });

  it('tokenizes a function call', () => {
    const tokens = tokenize('sma(close, 20)');
    expect(tokens.map(t => t.type)).toEqual([
      'identifier', 'lparen', 'identifier', 'comma', 'number', 'rparen', 'eof',
    ]);
  });

  it('tokenizes decimal numbers', () => {
    const tokens = tokenize('3.14');
    expect(tokens[0].type).toBe('number');
    expect(tokens[0].value).toBe('3.14');
  });

  it('tokenizes nested expressions', () => {
    const tokens = tokenize('(close - open) * 100');
    const types = tokens.map(t => t.type);
    expect(types).toEqual([
      'lparen', 'identifier', 'operator', 'identifier', 'rparen',
      'operator', 'number', 'eof',
    ]);
  });

  it('handles whitespace correctly', () => {
    const tokens1 = tokenize('close+10');
    const tokens2 = tokenize('  close  +  10  ');
    // Should produce the same tokens (ignoring positions)
    expect(tokens1.map(t => t.value)).toEqual(tokens2.map(t => t.value));
  });

  it('throws on unexpected characters', () => {
    expect(() => tokenize('close @ 10')).toThrow('Unexpected character');
  });

  it('tokenizes all operators', () => {
    const tokens = tokenize('1 + 2 - 3 * 4 / 5');
    const ops = tokens.filter(t => t.type === 'operator').map(t => t.value);
    expect(ops).toEqual(['+', '-', '*', '/']);
  });

  it('tokenizes negative numbers via unary minus', () => {
    const tokens = tokenize('-10');
    expect(tokens.map(t => t.type)).toEqual(['operator', 'number', 'eof']);
    expect(tokens[0].value).toBe('-');
    expect(tokens[1].value).toBe('10');
  });
});

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe('parse', () => {
  it('parses a number literal', () => {
    const tokens = tokenize('42');
    const ast = parse(tokens);
    expect(ast).toEqual({ type: 'number', value: 42 });
  });

  it('parses a variable', () => {
    const tokens = tokenize('close');
    const ast = parse(tokens);
    expect(ast).toEqual({ type: 'variable', name: 'close' });
  });

  it('parses a binary addition', () => {
    const tokens = tokenize('close + 10');
    const ast = parse(tokens);
    expect(ast.type).toBe('binary');
    if (ast.type === 'binary') {
      expect(ast.op).toBe('+');
      expect(ast.left).toEqual({ type: 'variable', name: 'close' });
      expect(ast.right).toEqual({ type: 'number', value: 10 });
    }
  });

  it('parses operator precedence correctly (multiply before add)', () => {
    const tokens = tokenize('close + 10 * 2');
    const ast = parse(tokens);
    // Should be: close + (10 * 2)
    expect(ast.type).toBe('binary');
    if (ast.type === 'binary') {
      expect(ast.op).toBe('+');
      expect(ast.left).toEqual({ type: 'variable', name: 'close' });
      expect(ast.right.type).toBe('binary');
      if (ast.right.type === 'binary') {
        expect(ast.right.op).toBe('*');
      }
    }
  });

  it('parses parenthesized expressions', () => {
    const tokens = tokenize('(close + 10) * 2');
    const ast = parse(tokens);
    expect(ast.type).toBe('binary');
    if (ast.type === 'binary') {
      expect(ast.op).toBe('*');
      expect(ast.left.type).toBe('binary');
      expect(ast.right).toEqual({ type: 'number', value: 2 });
    }
  });

  it('parses function calls', () => {
    const tokens = tokenize('sma(close, 20)');
    const ast = parse(tokens);
    expect(ast.type).toBe('call');
    if (ast.type === 'call') {
      expect(ast.name).toBe('sma');
      expect(ast.args).toHaveLength(2);
      expect(ast.args[0]).toEqual({ type: 'variable', name: 'close' });
      expect(ast.args[1]).toEqual({ type: 'number', value: 20 });
    }
  });

  it('parses nested function calls', () => {
    const tokens = tokenize('sma(ema(close, 9), 20)');
    const ast = parse(tokens);
    expect(ast.type).toBe('call');
    if (ast.type === 'call') {
      expect(ast.name).toBe('sma');
      expect(ast.args[0].type).toBe('call');
    }
  });

  it('parses unary minus', () => {
    const tokens = tokenize('-close');
    const ast = parse(tokens);
    expect(ast.type).toBe('unary');
    if (ast.type === 'unary') {
      expect(ast.op).toBe('-');
      expect(ast.operand).toEqual({ type: 'variable', name: 'close' });
    }
  });

  it('throws on unknown variable', () => {
    const tokens = tokenize('unknownvar');
    expect(() => parse(tokens)).toThrow("Unknown variable 'unknownvar'");
  });

  it('throws on unexpected token', () => {
    const tokens = tokenize('+ +');
    expect(() => parse(tokens)).toThrow();
  });

  it('throws when tokens remain after expression', () => {
    const tokens = tokenize('close open');
    expect(() => parse(tokens)).toThrow();
  });

  it('is case-insensitive for function names', () => {
    const tokens = tokenize('SMA(close, 20)');
    const ast = parse(tokens);
    expect(ast.type).toBe('call');
    if (ast.type === 'call') {
      expect(ast.name).toBe('sma');
    }
  });
});

// ---------------------------------------------------------------------------
// Validator tests
// ---------------------------------------------------------------------------

describe('validate', () => {
  it('returns valid for a correct formula', () => {
    expect(validate('sma(close, 20)')).toEqual({ valid: true });
  });

  it('returns valid for complex formulas', () => {
    expect(validate('(close - sma(close, 20)) / sma(close, 20) * 100')).toEqual({ valid: true });
  });

  it('returns error for unknown variable', () => {
    const result = validate('foo + 1');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unknown variable');
  });

  it('returns error for wrong number of arguments', () => {
    const result = validate('sma(close)');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('requires 2 arguments');
  });

  it('returns error for non-constant period', () => {
    const result = validate('sma(close, close)');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('constant number');
  });

  it('returns error for negative period', () => {
    const result = validate('sma(close, -5)');
    expect(result.valid).toBe(false);
    // The parser will parse -5 as a unary expression, not a constant
    expect(result.error).toBeDefined();
  });

  it('returns error for non-integer period', () => {
    const result = validate('sma(close, 3.5)');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('positive integer');
  });

  it('returns error for syntax errors', () => {
    const result = validate('close + ');
    expect(result.valid).toBe(false);
  });

  it('returns error for empty formula', () => {
    const result = validate('');
    expect(result.valid).toBe(false);
  });

  it('validates abs with 1 argument', () => {
    expect(validate('abs(close - open)')).toEqual({ valid: true });
  });

  it('rejects abs with 2 arguments', () => {
    const result = validate('abs(close, open)');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('requires 1 argument');
  });

  it('validates max/min with 2 arguments', () => {
    expect(validate('max(close, open)')).toEqual({ valid: true });
    expect(validate('min(high, low)')).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// Evaluator tests
// ---------------------------------------------------------------------------

describe('evaluateFormula', () => {
  it('returns empty values for empty data', () => {
    const result = evaluateFormula('close', []);
    expect(result.values).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it('evaluates a simple variable (close)', () => {
    const candles = makeCandles([100, 110, 120]);
    const result = evaluateFormula('close', candles);
    expect(result.values).toHaveLength(3);
    expect(result.values[0].value).toBe(100);
    expect(result.values[1].value).toBe(110);
    expect(result.values[2].value).toBe(120);
  });

  it('evaluates a constant formula', () => {
    const candles = makeCandles([100, 110, 120]);
    const result = evaluateFormula('42', candles);
    expect(result.values).toHaveLength(3);
    result.values.forEach(v => expect(v.value).toBe(42));
  });

  it('evaluates arithmetic on variables', () => {
    const candles = makeCandles([100, 110, 120]);
    const result = evaluateFormula('close + 10', candles);
    expect(result.values[0].value).toBe(110);
    expect(result.values[1].value).toBe(120);
    expect(result.values[2].value).toBe(130);
  });

  it('evaluates close - open', () => {
    const candles = makeCandles([100, 110, 120]);
    // open = close - 1 in our makeCandles helper
    const result = evaluateFormula('close - open', candles);
    result.values.forEach(v => expect(v.value).toBe(1));
  });

  it('evaluates hl2 correctly', () => {
    const candles = makeCandles([100]); // high = 102, low = 98
    const result = evaluateFormula('hl2', candles);
    expect(result.values[0].value).toBe(100); // (102 + 98) / 2
  });

  it('evaluates hlc3 correctly', () => {
    const candles = makeCandles([100]); // high = 102, low = 98, close = 100
    const result = evaluateFormula('hlc3', candles);
    expect(result.values[0].value).toBe(100); // (102 + 98 + 100) / 3
  });

  it('evaluates ohlc4 correctly', () => {
    const candles = makeCandles([100]); // open=99, high=102, low=98, close=100
    const result = evaluateFormula('ohlc4', candles);
    expect(result.values[0].value).toBeCloseTo((99 + 102 + 98 + 100) / 4, 4);
  });

  it('evaluates multiplication and division', () => {
    const candles = makeCandles([100, 200]);
    const result = evaluateFormula('close * 2 / 100', candles);
    expect(result.values[0].value).toBe(2);
    expect(result.values[1].value).toBe(4);
  });

  it('evaluates SMA correctly', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = evaluateFormula('sma(close, 3)', candles);
    // SMA(3): first 2 bars should be NaN (not included)
    // bar 2: (10+20+30)/3 = 20
    // bar 3: (20+30+40)/3 = 30
    // bar 4: (30+40+50)/3 = 40
    expect(result.values).toHaveLength(3);
    expect(result.values[0].value).toBe(20);
    expect(result.values[1].value).toBe(30);
    expect(result.values[2].value).toBe(40);
  });

  it('evaluates EMA correctly', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = evaluateFormula('ema(close, 3)', candles);
    // First EMA value = SMA of first 3 = 20
    expect(result.values[0].value).toBe(20);
    // multiplier = 2/(3+1) = 0.5
    // ema[1] = (40 - 20) * 0.5 + 20 = 30
    expect(result.values[1].value).toBe(30);
    // ema[2] = (50 - 30) * 0.5 + 30 = 40
    expect(result.values[2].value).toBe(40);
  });

  it('evaluates highest correctly', () => {
    const candles = makeCandles([10, 30, 20, 40, 50]);
    const result = evaluateFormula('highest(close, 3)', candles);
    // bar 2: max(10,30,20) = 30
    // bar 3: max(30,20,40) = 40
    // bar 4: max(20,40,50) = 50
    expect(result.values).toHaveLength(3);
    expect(result.values[0].value).toBe(30);
    expect(result.values[1].value).toBe(40);
    expect(result.values[2].value).toBe(50);
  });

  it('evaluates lowest correctly', () => {
    const candles = makeCandles([50, 30, 40, 20, 10]);
    const result = evaluateFormula('lowest(close, 3)', candles);
    // bar 2: min(50,30,40) = 30
    // bar 3: min(30,40,20) = 20
    // bar 4: min(40,20,10) = 10
    expect(result.values).toHaveLength(3);
    expect(result.values[0].value).toBe(30);
    expect(result.values[1].value).toBe(20);
    expect(result.values[2].value).toBe(10);
  });

  it('evaluates abs correctly', () => {
    const candles = makeCandles([100, 90, 110]);
    const result = evaluateFormula('abs(close - 100)', candles);
    expect(result.values[0].value).toBe(0);
    expect(result.values[1].value).toBe(10);
    expect(result.values[2].value).toBe(10);
  });

  it('evaluates sqrt correctly', () => {
    const candles = makeCandles([16, 25, 36]);
    const result = evaluateFormula('sqrt(close)', candles);
    expect(result.values[0].value).toBe(4);
    expect(result.values[1].value).toBe(5);
    expect(result.values[2].value).toBe(6);
  });

  it('evaluates max correctly', () => {
    const candles = makeCandles([100, 200, 150]);
    const result = evaluateFormula('max(close, 150)', candles);
    expect(result.values[0].value).toBe(150);
    expect(result.values[1].value).toBe(200);
    expect(result.values[2].value).toBe(150);
  });

  it('evaluates min correctly', () => {
    const candles = makeCandles([100, 200, 150]);
    const result = evaluateFormula('min(close, 150)', candles);
    expect(result.values[0].value).toBe(100);
    expect(result.values[1].value).toBe(150);
    expect(result.values[2].value).toBe(150);
  });

  it('evaluates unary minus', () => {
    const candles = makeCandles([100, 200]);
    const result = evaluateFormula('-close', candles);
    expect(result.values[0].value).toBe(-100);
    expect(result.values[1].value).toBe(-200);
  });

  it('handles division by zero gracefully', () => {
    const candles = makeCandles([0, 100]);
    const result = evaluateFormula('100 / close', candles);
    // First bar: 100/0 should be NaN -> skipped
    // Second bar: 100/100 = 1
    expect(result.values).toHaveLength(1);
    expect(result.values[0].value).toBe(1);
  });

  it('returns error for unknown function', () => {
    const candles = makeCandles([100]);
    const result = evaluateFormula('unknown(close)', candles);
    expect(result.error).toBeDefined();
    expect(result.values).toEqual([]);
  });

  it('returns error for syntax errors', () => {
    const candles = makeCandles([100]);
    const result = evaluateFormula('close +', candles);
    expect(result.error).toBeDefined();
  });

  it('returns error for unexpected characters', () => {
    const candles = makeCandles([100]);
    const result = evaluateFormula('close @ 10', candles);
    expect(result.error).toBeDefined();
  });

  it('evaluates complex formula: SMA crossover difference', () => {
    // 60 candles so both SMA(20) and SMA(50) have data
    const candles = makeCandles(Array.from({ length: 60 }, (_, i) => 100 + i));
    const result = evaluateFormula('sma(close, 20) - sma(close, 50)', candles);
    // Both SMA(20) and SMA(50) should have values starting from bar 49
    expect(result.values.length).toBeGreaterThan(0);
    // SMA(20) at bar 49 = avg of bars 30..49 = avg of [130..149] = 139.5
    // SMA(50) at bar 49 = avg of bars 0..49 = avg of [100..149] = 124.5
    // Difference = 15
    expect(result.values[0].value).toBe(15);
  });

  it('evaluates complex formula: percentage deviation from SMA', () => {
    const candles = makeCandles(Array.from({ length: 25 }, (_, i) => 100 + i));
    const result = evaluateFormula('(close - sma(close, 20)) / sma(close, 20) * 100', candles);
    expect(result.values.length).toBeGreaterThan(0);
    // Values should be positive since close > SMA for a rising series
    result.values.forEach(v => expect(v.value).toBeGreaterThan(0));
  });

  it('evaluates Donchian midline formula', () => {
    const candles = makeCandles([10, 20, 30, 40, 50, 15, 25, 35, 45, 55, 12, 22, 32, 42, 52]);
    const result = evaluateFormula('(highest(high, 14) + lowest(low, 14)) / 2', candles);
    expect(result.values.length).toBeGreaterThan(0);
  });

  it('evaluates custom stochastic formula', () => {
    const candles = makeCandles(
      Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i) * 10),
    );
    const result = evaluateFormula(
      '(close - lowest(low, 14)) / (highest(high, 14) - lowest(low, 14)) * 100',
      candles,
    );
    expect(result.values.length).toBeGreaterThan(0);
    // Stochastic values should be between 0 and 100
    result.values.forEach(v => {
      expect(v.value).toBeGreaterThanOrEqual(0);
      expect(v.value).toBeLessThanOrEqual(100);
    });
  });

  it('preserves timestamps from candle data', () => {
    const candles = makeCandles([100, 110, 120]);
    const result = evaluateFormula('close', candles);
    expect(result.values[0].time).toBe(candles[0].time);
    expect(result.values[1].time).toBe(candles[1].time);
    expect(result.values[2].time).toBe(candles[2].time);
  });

  it('evaluates volume variable', () => {
    const candles = makeCandles([100, 200, 300]);
    // volume = 1000 * (i+1) in our helper
    const result = evaluateFormula('volume', candles);
    expect(result.values[0].value).toBe(1000);
    expect(result.values[1].value).toBe(2000);
    expect(result.values[2].value).toBe(3000);
  });

  it('handles case insensitive function names', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = evaluateFormula('SMA(close, 3)', candles);
    expect(result.values).toHaveLength(3);
    expect(result.values[0].value).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Preset formulas validation
// ---------------------------------------------------------------------------

describe('FORMULA_PRESETS', () => {
  it('all presets are syntactically valid', () => {
    for (const preset of FORMULA_PRESETS) {
      const result = validate(preset.formula);
      expect(result.valid).toBe(true);
    }
  });

  it('all presets evaluate without errors on sample data', () => {
    const candles = makeCandles(Array.from({ length: 60 }, (_, i) => 100 + i));
    for (const preset of FORMULA_PRESETS) {
      const result = evaluateFormula(preset.formula, candles);
      expect(result.error).toBeUndefined();
      expect(result.values.length).toBeGreaterThan(0);
    }
  });
});

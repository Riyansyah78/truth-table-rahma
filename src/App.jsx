import React, { useState, useRef, useEffect } from 'react';

// --- Logika Kalkulator (dengan dukungan simbol) ---

// Fungsi operasi logika dasar
const evalAND = (a, b) => a && b;
const evalOR = (a, b) => a || b;
const evalNOT = (a) => !a;
const evalIMP = (a, b) => !a || b;
const evalBIMP = (a, b) => a === b;
const evalNAND = (a, b) => !(a && b);
const evalNOR = (a, b) => !(a || b);
const evalXOR = (a, b) => a !== b;

// --- KOMPUTASI TABEL KEBENARAN ---

// Fungsi untuk mengubah ekspresi infix menjadi postfix
const infixToPostfix = (tokens, precedence) => {
  const output = [];
  const operators = [];

  for (const token of tokens) {
    if (/^[A-Z]$/.test(token) || token === 'true' || token === 'false') {
      output.push(token);
    } else if (token === '(') {
      operators.push(token);
    } else if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop());
      }
      if (operators.length === 0) throw new Error('Kurung tidak seimbang');
      operators.pop();
    } else { // Operator
      while (
        operators.length > 0 &&
        operators[operators.length - 1] !== '(' &&
        precedence[operators[operators.length - 1]] >= precedence[token]
      ) {
        output.push(operators.pop());
      }
      operators.push(token);
    }
  }

  while (operators.length > 0) {
    if (operators[operators.length - 1] === '(') {
      throw new Error('Kurung tidak seimbang');
    }
    output.push(operators.pop());
  }

  return output;
};

const evaluatePostfix = (postfixTokens, variableValues) => {
  const stack = [];

  for (const token of postfixTokens) {
    // Skip token kosong atau whitespace
    if (!token || token.trim() === '') continue;
    
    if (/^[A-Z]$/.test(token)) {
      stack.push(variableValues[token]);
    } else if (token === 'true') {
      stack.push(true);
    } else if (token === 'false') {
      stack.push(false);
    } else { // Operator
      if (token === '¬' || token === 'NOT') {
        if (stack.length < 1) throw new Error('Ekspresi tidak valid: operator NOT kekurangan operand.');
        const a = stack.pop();
        stack.push(evalNOT(a));
      } else {
        if (stack.length < 2) throw new Error('Ekspresi tidak valid: operator kekurangan operand.');
        const b = stack.pop();
        const a = stack.pop();
        switch (token) {
          case '∧': case 'AND': stack.push(evalAND(a, b)); break;
          case '∨': case 'OR': stack.push(evalOR(a, b)); break;
          case '↑': case 'NAND': stack.push(evalNAND(a, b)); break;
          case '↓': case 'NOR': stack.push(evalNOR(a, b)); break;
          case '⊕': case 'XOR': stack.push(evalXOR(a, b)); break;
          case '→': case 'IMP': stack.push(evalIMP(a, b)); break;
          case '↔': case 'BIMP': stack.push(evalBIMP(a, b)); break;
          default:
            throw new Error(`Operator tidak dikenal: ${token}`);
        }
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error(`Ekspresi tidak valid: hasil evaluasi menghasilkan ${stack.length} nilai (seharusnya 1). Periksa kembali ekspresi Anda.`);
  }
  return stack.pop();
};

// Fungsi untuk mengekstrak sub-ekspresi dari postfix
const extractSubExpressions = (postfixTokens, precedence) => {
  const subExprs = new Set();
  const stack = [];
  
  for (const token of postfixTokens) {
    if (!token || token.trim() === '') continue;
    
    if (/^[A-Z]$/.test(token)) {
      stack.push(token);
    } else if (token === 'true' || token === 'false') {
      stack.push(token);
    } else {
      if (token === '¬' || token === 'NOT') {
        if (stack.length < 1) continue;
        const a = stack.pop();
        const expr = `¬${a}`;
        subExprs.add(expr);
        stack.push(expr);
      } else {
        if (stack.length < 2) continue;
        const b = stack.pop();
        const a = stack.pop();
        const expr = `(${a} ${token} ${b})`;
        subExprs.add(expr);
        stack.push(expr);
      }
    }
  }
  
  // Filter dan urutkan berdasarkan kompleksitas
  return Array.from(subExprs)
    .filter(expr => !(/^[A-Z]$/.test(expr))) // Hapus variabel tunggal
    .sort((a, b) => a.length - b.length); // Urutkan dari sederhana ke kompleks
};

// Fungsi untuk mengevaluasi sub-ekspresi
const evaluateSubExpression = (subExpr, variableValues) => {
  try {
    const precedence = {
      '¬': 4, 'NOT': 4, '∧': 3, 'AND': 3, '↑': 3, 'NAND': 3,
      '∨': 2, 'OR': 2, '↓': 2, 'NOR': 2, '⊕': 2, 'XOR': 2,
      '→': 1, 'IMP': 1, '↔': 1, 'BIMP': 1
    };
    
    const tokenize = (input) => {
      let processedExpr = input;
      processedExpr = processedExpr.replace(/([∧∨¬→↔⊕↑↓()])/g, ' $1 ');
      processedExpr = processedExpr.replace(/\s+/g, ' ').trim();
      return processedExpr.split(/\s+/).filter(token => token.length > 0);
    };
    
    const tokens = tokenize(subExpr);
    const postfix = infixToPostfix(tokens, precedence);
    return evaluatePostfix(postfix, variableValues);
  } catch (e) {
    return null;
  }
};

const calculateNormalFormsTableData = (usedVars, rows) => {
  const getLiteral = (variable, value) => ({ variable, value });


   // --- Menghitung DNF ---
  const trueRows = rows.filter(row => row.result);
  const dnfClausesData = trueRows.map(row => ({
    values: usedVars.map(v => ({ var: v, value: row.values[v] ? 'B' : 'S', isNegated: !row.values[v] })),
    resultString: 'B',
    expressionString: usedVars.map(v => row.values[v] ? v : `¬${v}`).join(' ∧ '),
  }));
  const dnfString = dnfClausesData.map(clause => clause.expressionString.length > 1 ? `(${clause.expressionString})` : clause.expressionString).join(' ∨ ') || "False (kontradiksi)";

  // --- Menghitung CNF ---
  const falseRows = rows.filter(row => !row.result);
  const cnfClausesData = falseRows.map(row => ({
    values: usedVars.map(v => ({ var: v, value: row.values[v] ? 'B' : 'S', isNegated: row.values[v] })),
    resultString: 'S',
    expressionString: usedVars.map(v => row.values[v] ? `¬${v}` : v).join(' ∨ '),
  }));
  const cnfString = cnfClausesData.map(clause => clause.expressionString.length > 1 ? `(${clause.expressionString})` : clause.expressionString).join(' ∧ ') || "True (tautologi)";

  return { dnfClausesData, dnfString, cnfClausesData, cnfString };
};

// --- Komponen React ---

const TruthTableCalculator = () => {
  const [expression, setExpression] = useState('');
  const [results, setResults] = useState(null);
  const textAreaRef = useRef(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, []);

  const handleCalculate = () => {
    const expr = expression.trim();
    if (!expr) { alert('Masukkan ekspresi terlebih dahulu!'); return; }

    const precedence = {
      '¬': 4, 'NOT': 4, '∧': 3, 'AND': 3, '↑': 3, 'NAND': 3,
      '∨': 2, 'OR': 2, '↓': 2, 'NOR': 2, '⊕': 2, 'XOR': 2,
      '→': 1, 'IMP': 1, '↔': 1, 'BIMP': 1
    };
    
    const usedVars = [...new Set(expr.match(/\b[A-Z]\b/g))];
    if (usedVars.length === 0) { alert('Ekspresi harus mengandung setidaknya satu variabel (contoh: A, B, C)!'); return; }

    // Validasi: cek jika ada variabel langsung diikuti kurung buka tanpa operator
    if (/[A-Z]\s*\(/.test(expr)) {
      alert('Error: Variabel tidak boleh langsung diikuti kurung buka!\n\nContoh salah: P ∧ Q(¬P ∨ Q)\nContoh benar: P ∧ Q ∧ (¬P ∨ Q)\n\nTambahkan operator (∧, ∨, →, dll) antara variabel dan kurung.');
      return;
    }
    
    // Validasi: cek jika ada kurung tutup diikuti variabel tanpa operator
    if (/\)\s*[A-Z]/.test(expr)) {
      alert('Error: Kurung tutup tidak boleh langsung diikuti variabel!\n\nContoh salah: (A ∨ B)C\nContoh benar: (A ∨ B) ∧ C\n\nTambahkan operator (∧, ∨, →, dll) antara kurung dan variabel.');
      return;
    }

    const tokenize = (input) => {
      let processedExpr = input;
      // Tambahkan spasi di sekitar operator dan kurung
      processedExpr = processedExpr.replace(/([∧∨¬→↔⊕↑↓()])/g, ' $1 ');
      // Hapus multiple whitespace dan trim
      processedExpr = processedExpr.replace(/\s+/g, ' ').trim();
      // Split dan filter token kosong
      return processedExpr.split(/\s+/).filter(token => token.length > 0);
    };

    let tokens, postfixTokens;
    try {
      tokens = tokenize(expr);
      postfixTokens = infixToPostfix(tokens, precedence);
    } catch (e) { alert('Kesalahan dalam ekspresi: ' + e.message); return; }

    const numRows = Math.pow(2, usedVars.length);
    const rows = [];
    
    // Ekstrak sub-ekspresi
    const subExpressions = extractSubExpressions(postfixTokens, precedence);
    
    for (let i = 0; i < numRows; i++) {
      const values = {};
      for (let j = 0; j < usedVars.length; j++) {
        values[usedVars[j]] = Boolean((i >> (usedVars.length - 1 - j)) & 1);
      }
      let result;
      try { result = evaluatePostfix(postfixTokens, values); }
      catch (e) { alert('Kesalahan saat mengevaluasi: ' + e.message); setResults(null); return; }
      
      // Evaluasi semua sub-ekspresi
      const subResults = {};
      for (const subExpr of subExpressions) {
        subResults[subExpr] = evaluateSubExpression(subExpr, values);
      }
      
      rows.push({ values, result, subResults });
    }

    // Hitung data untuk CNF dan DNF
    const normalFormsData = calculateNormalFormsTableData(usedVars, rows);

    setResults({ usedVars, rows, formula: expression, normalFormsData, subExpressions });
  };

  const buttonConfigs = [
    { text: '∧', className: 'btn-operator', action: () => setExpression(prev => prev + ' ∧ ') },
    { text: '∨', className: 'btn-operator', action: () => setExpression(prev => prev + ' ∨ ') },
    { text: '¬', className: 'btn-operator', action: () => setExpression(prev => prev + ' ¬ ') },
    { text: '→', className: 'btn-operator', action: () => setExpression(prev => prev + ' → ') },
    { text: '↔', className: 'btn-operator', action: () => setExpression(prev => prev + ' ↔ ') },
    { text: '⊕', className: 'btn-operator', action: () => setExpression(prev => prev + ' ⊕ ') },
    { text: '↑', className: 'btn-operator', action: () => setExpression(prev => prev + ' ↑ ') },
    { text: '↓', className: 'btn-operator', action: () => setExpression(prev => prev + ' ↓ ') },
    { text: '(', className: 'btn-action', action: () => setExpression(prev => prev + '(') },
    { text: ')', className: 'btn-action', action: () => setExpression(prev => prev + ')') },
    { text: '⌫', className: 'btn-clear', action: () => setExpression(prev => prev.slice(0, -1)) },
    { text: 'C', className: 'btn-clear', action: () => { setExpression(''); setResults(null); } },
  ];


 // --- JSX Rendering ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffecd2] via-[#fcb69f] to-[#ffecd2] p-5 font-sans">
      <div className="max-w-5xl mx-auto bg-white/95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl">
        {/* ... Header dan Kalkulator Input ... (sama seperti sebelumnya) */}
        <h1 className="text-center text-4xl font-extrabold mb-8 bg-gradient-to-r from-pink-400 to-pink-200 bg-clip-text text-transparent">🔢 Kalkulator Tabel Kebenaran</h1>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-2xl mb-8 shadow-lg">
          {/* ... Bagian textarea dan tombol ... (sama) */}
          <textarea ref={textAreaRef} className="w-full min-h-[80px] p-5 text-2xl text-[#6b5b95] font-mono bg-white rounded-xl border-4 border-[#ffd1dc] focus:outline-none focus:border-[#ffb6c1] focus:ring-4 focus:ring-pink-300/50 transition-all duration-300" value={expression} onChange={(e) => setExpression(e.target.value)} placeholder="Ketik ekspresi... (contoh: (A ∧ B) ∨ ¬C)" />
          <div className="grid grid-cols-4 gap-3 mb-5">
            {buttonConfigs.map((btn, index) => (<button key={index} onClick={btn.action} className={`p-4 font-bold rounded-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg active:translate-y-0.5 text-base ${btn.className === 'btn-operator' ? 'bg-gradient-to-r from-red-300 to-red-400 text-white border-2 border-red-400 hover:from-red-400 hover:to-red-500' : ''} ${btn.className === 'btn-action' ? 'bg-gradient-to-r from-yellow-300 to-orange-300 text-yellow-900 border-2 border-orange-300 hover:from-orange-300 hover:to-orange-400' : ''} ${btn.className === 'btn-clear' ? 'bg-gradient-to-r from-red-400 to-red-500 text-white border-2 border-red-500 hover:from-red-500 hover:to-red-600' : ''} `}>{btn.text}</button>))}
          </div>
          <button onClick={handleCalculate} className="w-full col-span-4 p-5 text-lg text-white font-bold bg-gradient-to-r from-purple-300 to-purple-400 border-4 border-purple-400 rounded-xl uppercase tracking-widest cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg active:translate-y-0.5">HITUNG TABEL KEBENARAN</button>
        </div>

        {results && (
          <div className="result-section mt-8">
            {/* --- TABEL KEBENARAN UTAMA --- */}
            <div className="bg-gradient-to-r from-green-100 to-yellow-50 p-5 rounded-xl mb-5 border-l-5 border-green-400 shadow-md">
              <h3 className="text-green-600 font-bold mb-2 text-lg">🔍 Ekspresi:</h3>
              <div className="text-lg text-green-800 font-mono font-semibold">{results.formula}</div>
            </div>
            <div className="overflow-x-auto rounded-xl shadow-lg mb-8">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead><tr>
                  {results.usedVars.map(v => <th key={v} className="bg-purple-600 text-white p-4 font-bold text-center">{v}</th>)}
                  {results.subExpressions && results.subExpressions.map((subExpr, idx) => (
                    <th key={`sub-${idx}`} className="bg-blue-500 text-white p-3 font-semibold text-center text-sm border-l-2 border-blue-300">{subExpr}</th>
                  ))}
                  <th className="bg-purple-600 text-white p-4 font-bold text-center border-l-4 border-purple-800">Hasil</th>
                </tr></thead>
                <tbody>
                  {results.rows.map((row, index) => (
                    <tr key={index} className={(index % 2 === 0) ? 'bg-gray-50' : ''}>
                      {results.usedVars.map(v => (
                        <td key={v} className={`p-3 text-center font-bold ${row.values[v] ? 'text-green-600' : 'text-red-600'}`}>{row.values[v] ? 'B' : 'S'}</td>
                      ))}
                      {results.subExpressions && results.subExpressions.map((subExpr, idx) => (
                        <td key={`sub-${idx}-${index}`} className={`p-3 text-center font-bold bg-blue-50 border-l-2 border-blue-200 ${row.subResults[subExpr] ? 'text-green-600' : 'text-red-600'}`}>
                          {row.subResults[subExpr] ? 'B' : 'S'}
                        </td>
                      ))}
                      <td className={`p-3 text-center font-bold bg-yellow-100 border-l-4 border-yellow-300 ${row.result ? 'text-green-600' : 'text-red-600'}`}>{row.result ? 'B' : 'S'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- TABEL DNB --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="bg-gradient-to-r from-indigo-100 to-blue-50 p-5 rounded-t-xl border-l-5 border-indigo-400 shadow-md">
                  <h3 className="text-indigo-600 font-bold mb-2 text-lg">∨ Disjunctive Normal Form (DNF)</h3>
                  <p className="text-indigo-800 font-mono text-sm mb-4">{results.normalFormsData.dnfString}</p>
                </div>
                <div className="overflow-x-auto rounded-b-xl shadow-lg">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead><tr>
                      {results.usedVars.map(v => <th key={`dnf-${v}`} className="bg-indigo-600 text-white p-3 font-bold text-center text-sm">{v}</th>)}
                      <th className="bg-indigo-600 text-white p-3 font-bold text-center text-sm">Klausul ∧</th>
                    </tr></thead>
                    <tbody>
                      {results.normalFormsData.dnfClausesData.length > 0 ? (
                        results.normalFormsData.dnfClausesData.map((clause, index) => (
                          <tr key={index} className={(index % 2 === 0) ? 'bg-gray-50' : ''}>
                            {clause.values.map(literal => (
                              <td key={literal.var} className={`p-2 text-center font-bold text-sm ${literal.value === 'B' ? 'text-green-600' : 'text-red-600'}`}>{literal.value}</td>
                            ))}
                            <td className="p-2 text-center font-semibold text-sm text-indigo-700">{clause.expressionString}</td>
                          </tr>
                        ))
                      ) : (
                         <tr><td colSpan={results.usedVars.length + 1} className="p-4 text-center text-gray-500 italic">Tidak ada minterm (hasil selalu Salah)</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- TABEL CNF --- */}
              <div>
                <div className="bg-gradient-to-r from-pink-100 to-purple-50 p-5 rounded-t-xl border-l-5 border-pink-400 shadow-md">
                  <h3 className="text-pink-600 font-bold mb-2 text-lg">∧ Conjunctive Normal Form (CNF)</h3>
                  <p className="text-pink-800 font-mono text-sm mb-4">{results.normalFormsData.cnfString}</p>
                </div>
                <div className="overflow-x-auto rounded-b-xl shadow-lg">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead><tr>
                      {results.usedVars.map(v => <th key={`cnf-${v}`} className="bg-pink-600 text-white p-3 font-bold text-center text-sm">{v}</th>)}
                      <th className="bg-pink-600 text-white p-3 font-bold text-center text-sm">Klausul ∨</th>
                    </tr></thead>
                    <tbody>
                      {results.normalFormsData.cnfClausesData.length > 0 ? (
                        results.normalFormsData.cnfClausesData.map((clause, index) => (
                          <tr key={index} className={(index % 2 === 0) ? 'bg-gray-50' : ''}>
                            {clause.values.map(literal => (
                              <td key={literal.var} className={`p-2 text-center font-bold text-sm ${!literal.isNegated ? 'text-green-600' : 'text-red-600'}`}>{literal.value}</td>
                            ))}
                            <td className="p-2 text-center font-semibold text-sm text-pink-700">{clause.expressionString}</td>
                          </tr>
                        ))
                      ) : (
                         <tr><td colSpan={results.usedVars.length + 1} className="p-4 text-center text-gray-500 italic">Tidak ada maxterm (hasil selalu Benar)</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... Panduan Penggunaan ... (sama) */}
        <div className="bg-yellow-50 p-5 rounded-xl mt-8 border-l-4 border-yellow-400 shadow-md">
          <h4 className="text-yellow-800 font-bold mb-2">📚 Cara Penggunaan:</h4>
          <p className="text-yellow-700 text-sm leading-relaxed">
            • Ketik ekspresi logika menggunakan huruf kapital (A-Z) sebagai variabel.<br/>
            • Gunakan tombol operator atau ketik simbol: <b>∧</b> (AND), <b>∨</b> (OR), <b>¬</b> (NOT), <b>↑</b> (NAND), <b>↓</b> (NOR), <b>⊕</b> (XOR), <b>→</b> (IMP), <b>↔</b> (BIMP).<br/>
            • Tekan HITUNG untuk melihat tabel kebenaran beserta bentuk normalnya (DNF dan CNF).<br/>
            • <b>Kolom biru</b> menampilkan hasil evaluasi sub-ekspresi untuk membantu memahami proses perhitungan.<br/>
            • Tabel DNF menunjukkan minterm (kombinasi variabel yang membuat hasil BENAR).<br/>
            • Tabel CNF menunjukkan maxterm (kombinasi variabel yang membuat hasil SALAH).<br/>
            • C = Clear (hapus semua), ⌫ = Backspace.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TruthTableCalculator;
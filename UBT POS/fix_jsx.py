filepath = r"d:\Anti garvity\UBT POS\UBT POS\src\app\(dashboard)\ubt\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

# We want to replace lines 492..498 (0-indexed), which are lines 493..499 (1-indexed)
# Content: broken button JSX
# With: proper two-button JSX + AktSverkaModal placement

new_block = """\
                                            <div className="flex items-center justify-between mt-4 gap-2">
                                                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono tracking-wider flex items-center gap-1"><FileText size={10}/> ID: {t.id.slice(-8)}</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setPreviewSverka({ isPreview: true, customerName: tName, date: new Date().toLocaleString("uz-UZ"), currentDebt: remainingAmount, isOurDebt })}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5">
                                                        <Printer size={12}/> Akt Sverka
                                                    </button>
                                                    <button onClick={() => handlePay(t.id, t.amount, alreadyPaid, tName)} disabled={paying === t.id}
                                                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                                                        {paying === t.id ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"/> : <CheckCircle size={13}/>}
                                                        To\u2019lov qilish
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    {previewSverka && <AktSverkaModal data={previewSverka} onClose={() => setPreviewSverka(null)} />}
"""

# Lines 492 to 498 inclusive (0-indexed) = lines 493-499 in file
result = lines[:492] + [l + "\n" for l in new_block.splitlines()] + lines[499:]

with open(filepath, "w", encoding="utf-8") as f:
    f.writelines(result)

print(f"Done. Total lines: {len(result)}")

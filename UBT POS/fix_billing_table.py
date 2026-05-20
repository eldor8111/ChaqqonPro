content = open(r'd:\ChaqqonPro\UBT POS\src\app\super-admin\page.tsx', 'r', encoding='utf-8').read()

# Fix billing tariff display
content = content.replace(
    "PLANS[b.plan as keyof typeof PLANS]?.color||\"\"`}>{PLANS[b.plan as keyof typeof PLANS]?.label||b.plan}",
    "b.tariffName === 'VIP' ? 'bg-yellow-500/10 text-yellow-600' : b.tariffName ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-500/10 text-slate-400'`}>{b.tariffName || b.plan || 'Standart'}"
)

# Fix price field name
content = content.replace('b.monthlyPrice > 0', 'b.pricePerMonth > 0')
content = content.replace('fmtMoney(b.monthlyPrice)', 'fmtMoney(b.pricePerMonth)')

with open(r'd:\ChaqqonPro\UBT POS\src\app\super-admin\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')

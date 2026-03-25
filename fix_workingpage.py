with open('src/pages/WorkingPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove orphaned old FILES subtab code: lines 645-809 (1-indexed)
out = [l for i, l in enumerate(lines, 1) if not (645 <= i <= 809)]

with open('src/pages/WorkingPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(out)

print(f'Done. Total lines: {len(out)}')

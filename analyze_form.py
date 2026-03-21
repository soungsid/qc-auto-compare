import urllib.request
import re

url = 'https://auto.canadaquebec.ca/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as r:
    html = r.read().decode('utf-8')

print('Status: OK, length:', len(html))

# Find form elements
forms = re.findall(r'<form[^>]*>.*?</form>', html, re.DOTALL)
print('Forms found:', len(forms))

# Find select elements
selects = re.findall(r'<select[^>]*>.*?</select>', html, re.DOTALL)
print('Selects found:', len(selects))
for s in selects:
    name_match = re.search(r'name=["\']([^"\']+)["\']', s)
    id_match = re.search(r'id=["\']([^"\']+)["\']', s)
    options = re.findall(r'<option[^>]*>([^<]+)</option>', s)
    name = name_match.group(1) if name_match else '?'
    sid = id_match.group(1) if id_match else '?'
    print(f'  Select name={name} id={sid} options={options[:5]}')

# Find inputs
inputs = re.findall(r'<input[^>]*>', html)
print('\nInputs found:', len(inputs))
for i in inputs[:15]:
    print(' ', i[:120])

# Find buttons
buttons = re.findall(r'<button[^>]*>.*?</button>', html, re.DOTALL)
print('\nButtons:', len(buttons))
for b in buttons[:5]:
    print(' ', b[:120].replace('\n', ' '))

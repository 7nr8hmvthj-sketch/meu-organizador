import csv
import mysql.connector
import os
from datetime import datetime, timedelta

conn = mysql.connector.connect(
    host=os.getenv('DATABASE_URL').split('@')[1].split('/')[0].split(':')[0],
    user=os.getenv('DATABASE_URL').split('://')[1].split(':')[0],
    password=os.getenv('DATABASE_URL').split('://')[1].split(':')[1].split('@')[0],
    database=os.getenv('DATABASE_URL').split('/')[-1]
)
cursor = conn.cursor()

# Limpar eventos
cursor.execute('DELETE FROM events WHERE userId = 1')
print('Tabela limpa')

# Funções auxiliares
def get_event_type(title, place):
    t = title.lower()
    if 'hc' in t and ('manhã' in t or 'manha' in t):
        return 'HC Manhã'
    if 'hc' in t and ('tarde' in t or '13-19' in t):
        return 'HC Tarde'
    if 'corredor' in t or 'observação' in t:
        return 'Zona Norte (Tarde)'
    if 'apoio' in t:
        return 'Apoio (19-01)'
    if 'noturno' in t:
        return 'Noturno (19-07)'
    if 'manhã' in t or 'manha' in t:
        return 'Zona Norte (Manhã)'
    if 'tarde' in t or '13-19' in t:
        return 'Zona Norte (Tarde)'
    if 'acad' in t or 'treino' in t or 'musculação' in t:
        return 'Musculação'
    if 'pilates' in t:
        return 'Pilates'
    if 'natação' in t or 'natacao' in t:
        return 'Natação'
    if any(x in t for x in ['virginia', 'sebastiana', 'pedro', 'aldemir']):
        return 'HD'
    if 'nutri' in t or 'terapia' in t or 'samila' in t:
        return 'Pessoal'
    return 'Plantão'

def get_color(event_type):
    if 'HC' in event_type:
        return '#ff3b30'
    if 'Zona Norte' in event_type:
        return '#30b0c7'
    if 'Noturno' in event_type:
        return '#5856d6'
    if 'Apoio' in event_type:
        return '#ff9500'
    if event_type == 'Musculação':
        return '#34c759'
    if event_type == 'Pilates':
        return '#af52de'
    if event_type == 'Natação':
        return '#007aff'
    if event_type == 'HD':
        return '#ff2d55'
    if event_type == 'Pessoal':
        return '#ffcc00'
    return '#8e8e93'

# Importar CSV
with open('/home/ubuntu/upload/Plantaozinho-Exported-Data.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    imported = 0
    for row in reader:
        date_str = row['start_date'].split('T')[0]
        date = datetime.strptime(date_str, '%Y-%m-%d') + timedelta(days=1)
        
        event_type = get_event_type(row['title'], row['place'])
        color = get_color(event_type)
        
        is_passed = (row['place'] == 'Passei' or 
                    'passei' in row['title'].lower() or 
                    'passei' in row['notes'].lower())
        
        cursor.execute(
            '''INSERT INTO events (userId, date, type, description, color, isPassed, passedReason, createdAt, updatedAt)
               VALUES (1, %s, %s, %s, %s, %s, %s, NOW(), NOW())''',
            (date.strftime('%Y-%m-%d'), event_type, row['title'], color, 
             1 if is_passed else 0, row['notes'] if is_passed else '')
        )
        imported += 1

print(f'{imported} eventos importados')

# Adicionar natação
natacao_schedule = [
    (1, '20:45'),  # Segunda
    (2, '11:40'),  # Terça
    (3, '20:45'),  # Quarta
    (5, '20:45'),  # Sexta
    (6, '12:10')   # Sábado
]

start_date = datetime(2026, 1, 31)
end_date = datetime(2026, 12, 31)
current = start_date
natacao_count = 0

while current <= end_date:
    for day, time in natacao_schedule:
        if current.weekday() == day:
            event_date = current + timedelta(days=1)
            cursor.execute(
                '''INSERT INTO events (userId, date, type, description, color, isPassed, passedReason, createdAt, updatedAt)
                   VALUES (1, %s, 'Natação', %s, '#007aff', 0, '', NOW(), NOW())''',
                (event_date.strftime('%Y-%m-%d'), f'Natação {time}')
            )
            natacao_count += 1
    current += timedelta(days=1)

print(f'{natacao_count} eventos de natação adicionados')

conn.commit()
cursor.close()
conn.close()
print('Importação completa!')

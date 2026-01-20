Esse InsightCSV AI é um projetinho web pra você pegar um arquivo .csv (tipo planilha exportada), subir na aplicação e receber insights automáticos rapidinho — sem precisar abrir Excel, sem ficar fazendo conta na mão.

## ✅ O que ele faz na prática (fluxo do usuário)
1. Você entra no site
2. Faz upload de um CSV
3. A aplicação lê as colunas (principalmente as numéricas) e calcula automaticamente:
   - mínimo (menor valor)
   - máximo (maior valor)
   - média
   - soma

4. Ela te mostra isso em tabelas e também em gráficos (com Recharts)
5. Se você quiser, você exporta um PDF****

## 🧠 Por que isso é útil?
Ele é dividido em 2 partes:

### 🔹 Backend (FastAPI em Python)
É o “motor” que faz a análise:
- recebe o arquivo CSV via upload
- usa Pandas/NumPy pra ler e calcular estatísticas
- devolve um JSON pro frontend com os resultados

➡️ roda em http://localhost:8000

### 🔹 Frontend (React + TypeScript)
É a parte visual:
- tem o botão de upload
- chama o backend com Axios
- mostra tabela + gráfico com Recharts
- gera PDF com jsPDF + jspdf-autotable

➡️ roda em http://localhost:5173


## 🚀 Como rodar o InsightCSV AI

## 1️⃣ Backend — FastAPI (Terminal 1)
### A) Entrar na pasta do backend
```cd backend```

### B) Criar o ambiente virtual
```python -m venv .venv```

### C) Ativar o ambiente virtual
```.\.venv\Scripts\Activate.ps1```

***Se der erro de permissão:***

```Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass``` <br>
```.\.venv\Scripts\Activate.ps1```

### D) Instalar as dependências
```pip install -r requirements.txt```

***Se não existir requirements.txt:***

```pip install fastapi uvicorn python-multipart pandas numpy``` <br>
```pip freeze > requirements.txt```

### E) Rodar o servidor
```python -m uvicorn app.main:app --reload --port 8000```

### F) Testar o backend

```http://localhost:8000/health```

***Resposta esperada:***
```{"status":"ok"}```

## 2️⃣ Frontend — React + Vite (Terminal 2)

### A) Entrar na pasta do frontend
```cd frontend```


### B) Instalar dependências
```npm install```

### C) Rodar o frontend
```npm run dev```

### D) Abrir no navegador
```http://localhost:5173```


## ⚠️ Regras importantes
- O backend (8000) precisa estar rodando antes do frontend
- Não feche os terminais enquanto estiver usando a aplicação
- O arquivo enviado precisa ser .csv













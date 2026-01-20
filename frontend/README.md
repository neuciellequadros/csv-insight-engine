# InsightCSV AI 📊

Aplicação web para **análise rápida de arquivos CSV**, ideal para extrair insights de dados sem complicação.

## ✨ Funcionalidades

- 📤 Upload de arquivos **.csv**
- 📈 Cálculo automático de **estatísticas**:
  - mínimo
  - máximo
  - média
  - soma
- 📊 Visualização gráfica com **Recharts**
- 📄 Exportação de **PDF profissional**, com tabelas formatadas (`jspdf-autotable`)

---

## 🧱 Tecnologias Utilizadas

### 🔹 Backend

- Python
- FastAPI
- Uvicorn
- Pandas
- NumPy
- CORS habilitado para comunicação com o frontend

### 🔹 Frontend

- React + TypeScript
- Vite
- Axios
- Recharts
- jsPDF
- jspdf-autotable

---

## ✅ Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- Node.js **18+**
- Python **3.11+** (ou 3.12)
- Git (opcional, mas recomendado)

---

## 🚀 Como Rodar o Projeto (Passo a Passo)

> ⚠️ Abra **dois terminais**:  
> um para o **backend** e outro para o **frontend**.

---

## 1️⃣ Backend — FastAPI

### A) Acessar a pasta

````bash
cd backend


### B) Criar e ativar ambiente virtual

**Windows (PowerShell):**
```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1


Se aparecer erro de permissao

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1


## Instalar dependencias

pip install -r requirements.txt


### Caso ainda não exista o requirements.txt:
pip install fastapi uvicorn python-multipart pandas numpy
pip freeze > requirements.txt


### Rodar o servidor
python -m uvicorn app.main:app --reload --port 8000

E) Testar o backend

Acesse:

http://localhost:8000/health


Resposta esperada:

{"status":"ok"}

2️⃣ Frontend — React + Vite
A) Acessar a pasta
cd frontend

B) Instalar dependências
npm install

C) Rodar o frontend
npm run dev

D) Abrir no navegador
http://localhost:5173

📌 Observações

Backend roda na porta 8000

Frontend roda na porta 5173

O backend deve estar rodando antes de usar o frontend
````

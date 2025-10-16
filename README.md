This is project is build for a assessement purpose , using 
Frontend: Next.js 14 (App Router) + React + TailwindCSS
Backend: FastAPI (Python) for scoring & selection endpoints
Storage: SQLite (via Prisma) for speed; can swap to Postgres later

This project help to get the details of user applied for a job , using the data thw system will score each employe based on the skills and experience.
It also suggest which employee suits to which Role , based on the skills and exp, 
At last we can find out 5 personal who can match the role with more skills and exp (top scorer)

## How to run this project in yor localHost
# Installing dependencies
# Root folder
mkdir hiring-ops && cd hiring-ops

# Frontend
pnpm create next-app@latest web --ts --eslint --src-dir --app --tailwind
cd web && pnpm add @tanstack/react-table lucide-react zod zustand axios react-hook-form @radix-ui/react-dropdown-menu
pnpm add -D prisma @types/node @types/react
cd ..

# Backend (Python)
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn[standard] pydantic[dotenv] pandas numpy scikit-learn python-multipart
pip install jsonschema
mkdir api && cd api && mkdir app && touch app/__init__.py && cd ..

#Create a schema and run the beloww code
#After creating the schema
cd web
pnpm add prisma @prisma/client
npx prisma migrate dev --name init

# Running in the localHost
#Backend- In the root directory 
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn[standard] pydantic[dotenv] pandas numpy scikit-learn python-multipart
pip show uvicorn  - confirm 
uvicorn app.main:app --reload --port 8001 --app-dir api


#Frontend-in the root directory 
cd web
pnpm run dev

Open the localhost in your browser


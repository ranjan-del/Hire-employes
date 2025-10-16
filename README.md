# root folder
mkdir hiring-ops && cd hiring-ops

# frontend
pnpm create next-app@latest web --ts --eslint --src-dir --app --tailwind
cd web && pnpm add @tanstack/react-table lucide-react zod zustand axios react-hook-form @radix-ui/react-dropdown-menu
pnpm add -D prisma @types/node @types/react
cd ..

# backend (Python)
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn[standard] pydantic[dotenv] pandas numpy scikit-learn python-multipart
pip install jsonschema
mkdir api && cd api && mkdir app && touch app/__init__.py && cd ..


#after creating the schema
cd web
pnpm add prisma @prisma/client
npx prisma migrate dev --name init


#then for backend in the root directory 
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn[standard] pydantic[dotenv] pandas numpy scikit-learn python-multipart
pip show uvicorn  - confirm 
uvicorn app.main:app --reload --port 8001 --app-dir api


#then for frontend in the root directory 
cd web
pnpm run dev


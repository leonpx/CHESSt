# CHESSt

CHESSt is a website for playing chess and scanning documented chess games.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js) or [Yarn](https://yarnpkg.com/)
*   A database compatible with Prisma (e.g., PostgreSQL, MySQL, SQLite). This guide assumes PostgreSQL.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/leonpx/chesst.git
    cd chesst
    ```
2.  **Install dependencies:**
    ```bash
    npm install 
    # or
    # yarn install
    ```

### Environment Setup

1.  **Create an environment file:**
    Copy the example environment file (if one exists, otherwise create `.env`):
    ```bash
    # cp .env.example .env  # If .env.example exists
    touch .env           # If .env.example doesn't exist
    ```
2.  **Configure environment variables:**
    Edit the `.env` file and add the necessary variables. At minimum, you'll likely need:
    ```dotenv
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
    
    # Clerk Authentication Variables (Get these from your Clerk dashboard)
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
    CLERK_SECRET_KEY=sk_...
    
    # You might need these depending on your Clerk setup
    # NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
    # NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
    ```
    Replace the placeholder values with your actual database connection string and Clerk keys.

### Database Setup

Run the Prisma migrations to set up your database schema:
```bash
npx prisma migrate dev
```
This command will also generate the Prisma Client based on your schema.

### Running the Application

**Development Mode:**

To run the app in development mode with hot-reloading (using Turbopack):
```bash
npm run dev
# or
# yarn dev
```
The application should be available at `http://localhost:3000` (or the next available port).

**Production Mode:**

1.  **Build the application:**
    ```bash
    npm run build
    # or
    # yarn build
    ```
2.  **Start the production server:**
    ```bash
    npm run start
    # or
    # yarn start
    ```

### Linting

To check the code for linting errors:
```bash
npm run lint
# or
# yarn lint
```
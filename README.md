Admin - Cloudflare Pages + Functions (Dark Theme)

i.   Description
ii.  Pre-requists
iii. Create infra
    (1) - R2 Object Storage
    (2) - D1 SQL database
    (3) - Add admin credentials
    (4) - Update wrangler.toml
    (5) - Create Project
    (6) - Create Project

i.
This repo contains admin and login page for a simple CloudFlare Pages+Function app to create and update the backend infra for use in website on cloudflare.
The plan is to have a D1 database storing websites assets (mainly images) information and thumbnail alongwith full image stored in R2 object storage. Information/Metadata in db can be used by individual pages to fetch the contents from db and R2.
Webpage designer can give control to owner to change the contents of site while retaining the core logic and assets locked. Eg (in my usecase) I can create the website for an artist with different pages for images belonging to different catagories. Then if owner wants to remove or add new art piece, they can update it in db using admin console.
(As you would have figured out, I am not a SW developer or web developer. So, though suggestions are welcome, rant >> /dev/null)

ii.
Pre-requists: We need Node & wrangler to be installed:

Node:
    On apt based Linux distro run this command on terminal: sudo apt install nodejs
    For other systems, seach the web :( I don't have any other system

Wrangler:
    Need node & npm (should be installed with node, else search the web)
    Run: npm i -D wrangler@latest

iii.
Following is the infra we'll need :

    1. R2 Object Storage
        - Create this in Cloudflare manually. We need bucket name to integrate.
        - In cloudflare dashboard, goto 'R2 Object Storage' -> 'Overview' -> Click on '+Create Bucket', enter name and select 'Standard'-> click 'Create Bucket'

    2. D1 SQL database
        - Create this in Cloudflare manually. We need db name and uniq id to integrate.
        - In cloudflare dashboard, goto 'Storage & Database' -> 'D1 SQ DataBase' -> Click on '+Create Database', enter name -> Click 'Create'
        2a. 4 tables in the database: users, artworks, artwork_images, audit_log
            - SQL commands for table with schema are present in file schema.sql
            - Goto 'Storage & Database' -> 'D1 SQ DataBase' -> Click on your database name -> Click on 'Explore Data' -> Past the contents of schema.sql in Query window -> Click 'Run'

    3. Add admin credentials to the users table (we need hashed password. Use the provided generate_admin_seed.js script present in local directory)
        - Run following commands
            cd local
            node generate_admin_seed.js admin@mysite securepasswd
        - Above command will generate sql commands, copy and past into Query Window as in Database table creation step

    4. Update wrangler.toml
        - Update project name
        - In section [d1_databases], Update database_name and database_id. Don't change the Binding (D1)
        - In section [r2_buckets], Update, bucket_name. Don't change the Binding (ARTIST_BUCKET)

    5. Create Pages and Function using wrangler:
        - Make sure you are in root dir of project and NOT in local. Ru following commands:
            npx wrangler login
            npx wrangler pages project create <Project name without '<' or '>' sign>
            npx wrangler pages deploy public/ --project-name <Project name without '<' or '>' sign>

    6. Setup JWT secret:
        - In cloudflare dashboard, goto 'Compute (Workers)' -> 'Workers & Pages'. You should see Pages project with above name, Click on it.
        - Goto 'Settings' -> In 'Variable and Secrets', click on '+Add' Selet following: Type = Secret, Variable Name = JWT_SECRET, Value = <Some random secret text> -> Click 'Save'
        - Deployment is to be done after JWT secret update. So this step should be done before last command in above step (4)


# GraphQL Project Manager API
API backend para gestión de proyectos y tareas en equipo, con 
autenticación mediante JWT.

## Descripción
Cada usuario puede registrarse e iniciar sesión, crear proyectos, añadir 
miembros a ellos y gestionar las tareas asociadas, con control de estado 
y prioridad.

## Tecnologías
- Node.js + TypeScript
- Apollo Server (GraphQL)
- MongoDB
- JWT para autenticación
- bcrypt para el cifrado de contraseñas

## Funcionalidades
- Registro e inicio de sesión de usuarios
- Creación, edición y eliminación de proyectos
- Gestión de miembros por proyecto
- Creación de tareas con prioridad (baja/media/alta) y estado 
  (pendiente/en progreso/completada)
- Asignación de tareas a miembros del equipo

## Cómo ejecutarlo
npm install
npm run dev

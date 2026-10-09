# REGLAS PERMANENTES DE TRABAJO — CHECK-LIST / CONTROL DE AVANCE DE OBRAS

## 1. PRINCIPIO GENERAL Y FLUJO DE PUBLICACIÓN OBLIGATORIO
Toda modificación, mejora, corrección visual o funcional solicitada en este proyecto debe implementarse, probarse, sincronizarse y publicarse en todas las plataformas correspondientes de manera continua y autónoma:

```
SOLICITUD → DESARROLLO → PRUEBAS LOCALES (`npm run build`) → GITHUB (`origin main`) → NETLIFY (`https://checklistvg.netlify.app`) → VERIFICACIÓN PÚBLICA
```

**Una tarea NUNCA se considerará terminada únicamente porque funciona en `localhost`. Solo estará terminada cuando funcione correctamente en la versión pública.**

---

## 2. PLATAFORMAS Y CONEXIONES OFICIALES
- **Entorno de desarrollo:** Antigravity IDE, `check-list`, React 19, TypeScript, Vite.
- **Control de versiones:** GitHub
  - Cuenta: `veniergn`
  - Repositorio: `https://github.com/veniergn/check-list.git`
  - Rama: `main`
- **Despliegue y Hosting:** Netlify
  - Proyecto: `checklistvg`
  - Dominio público: [https://checklistvg.netlify.app](https://checklistvg.netlify.app/)
  - Integración: Despliegue continuo activado por commits en `origin main`.
  - Directorio de publicación: `dist`.
- **Base de Datos:** Supabase
  - Proyecto activo: `wafcgdnnhxxchondmmtp.supabase.co`
  - Clave de preservación: Toda la información de obras, unidades, tareas, checklist, fotografías, cronogramas y usuarios debe conservarse intacta.

---

## 3. INTEGRIDAD DE DATOS (SUPABASE)
- **Cero pérdida de información:** Conservar obligatoriamente todas las obras (A3, Parque Los Andes, Parque Agustín y futuras), departamentos, ítems de checklist, porcentajes de avance, fotos, contratistas y configuraciones.
- **Sin operaciones destructivas:** Prohibido ejecutar `DROP`, `TRUNCATE`, borrados masivos, modificaciones destructivas de esquema o cambios de RLS sin autorización expresa del usuario y respaldo previo.
- Si una mejora requiere almacenar nuevos datos, utilizar un enfoque compatible hacia atrás (fallback a almacenamiento local seguro si una columna aún no existe en Supabase).

---

## 4. AUTOMATIZACIÓN DE GITHUB Y GIT CREDENTIALS
- El repositorio está configurado para resolver credenciales mediante `wincred` (`git-credential-wincred.exe`) de Windows, evitando bloqueos por modales interactivos de GCM:
  ```gitconfig
  [credential]
      helper =
      helper = wincred
  ```
- Para cada cambio técnico aprobado:
  1. Ejecutar `git status`.
  2. Verificar que no se incluyan archivos `.env` ni credenciales privadas.
  3. Crear un commit descriptivo y profesional.
  4. Ejecutar `git push origin main`.
  5. Confirmar que el commit esté publicado en GitHub sin conflictos ni force-push.

---

## 5. AUTOMATIZACIÓN DE NETLIFY Y VALIDACIÓN PÚBLICA
- Cada `git push origin main` dispara la compilación automática en Netlify.
- Tras el push, comprobar que Netlify complete el despliegue con estado `Published`.
- Verificar mediante peticiones o inspección del sitio en [https://checklistvg.netlify.app](https://checklistvg.netlify.app/) que:
  - El bundle JS nuevo esté publicado y activo.
  - La aplicación cargue sin errores críticos de consola.
  - La conexión con Supabase continúe funcionando con los datos reales.

---

## 6. FORMATO DE INFORME AL FINALIZAR CADA TAREA
Al concluir cualquier tarea, presentar el siguiente informe obligatorio:

```markdown
ACTUALIZACIÓN DE CHECK-LIST
Modificación solicitada:
[Descripción]

Implementación local:
[Completada / Pendiente / Error]

GitHub:
[Sincronizado / Pendiente / Error]

Commit:
[Identificador real]

Netlify:
[Publicado / En proceso / Error]

Supabase:
[Conexión verificada / No verificada / Requiere autorización]

Versión pública:
https://checklistvg.netlify.app

Pruebas:
[Resultados reales]

Resultado final:
[Actualización publicada correctamente o explicación del problema]
```

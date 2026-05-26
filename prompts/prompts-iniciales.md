# Prompts utilizados para la creación de tests unitarios - LTI

## Herramienta utilizada
- **IDE**: Cursor (con Claude Opus 4.6)
- **Fecha**: 26 de mayo de 2026

---

## Prompt 1 — Contexto y comprensión del proyecto

> entiende el proyecto.

**Objetivo**: Dar contexto completo al asistente sobre la estructura del proyecto, tecnologías, arquitectura y archivos clave antes de escribir cualquier código.

**Resultado**: El asistente exploró todo el repositorio y generó un resumen detallado del stack (TypeScript/Express/Prisma/PostgreSQL), la arquitectura por capas (domain/application/presentation/routes), los 4 modelos de dominio, los endpoints existentes, y la ausencia total de tests pese a tener las dependencias de Jest instaladas.

---

## Prompt 2 — Comprensión del ejercicio

> lo que se debe hacer esta en el archivo @ejercicio.txt. Entiendelo

**Objetivo**: Que el asistente entienda los requerimientos específicos del ejercicio: las 2 familias de tests (recepción de datos y guardado en BD), los entregables (`tests-iniciales.test.ts` y `prompts-iniciales.md`), la rama `tests-iniciales`, y la recomendación de mockear Prisma.

**Resultado**: El asistente identificó correctamente los dos ejes de testing, los entregables esperados y el flujo de entrega (rama -> commit -> PR).

---

## Prompt 3 — Creación de rama y diseño de prompts

> 1. Creemos la rama indicada
> 2. Ayudame a crear los prompts-iniciales para que todo se ejecute de forma correcta (según lo indicado TDD), completa y eficiente.

**Objetivo**: Crear la rama `tests-iniciales` y diseñar el documento de prompts que sirva como registro de la conversación con la IA y como guía metodológica del proceso TDD.

**Resultado**: Rama creada. Se generó este archivo documentando cada prompt con su objetivo y resultado.

---

## Prompt 4 — Generación de tests unitarios (TDD)

> Ahora crea el archivo `backend/src/tests/tests-iniciales.test.ts` con una suite completa de tests unitarios para la funcionalidad de insertar candidatos. Sigue estas directrices:
>
> **Familia 1 — Validación de datos (recepción del formulario):**
> - Tests para `validateCandidateData` de `application/validator.ts`
> - Validar nombres (vacío, muy corto, muy largo, caracteres inválidos, caracteres especiales como ñ y acentos)
> - Validar email (formato válido, formato inválido, vacío)
> - Validar teléfono (formato español válido 6/7/9 + 8 dígitos, inválido, vacío se acepta)
> - Validar fecha (formato YYYY-MM-DD válido e inválido)
> - Validar dirección (vacía se acepta, más de 100 caracteres falla)
> - Validar educación (institution y title requeridos, startDate requerido, endDate opcional)
> - Validar experiencia laboral (company y position requeridos, description opcional max 200 chars)
> - Validar CV (objeto con filePath y fileType requeridos)
> - Validar que si se envía `id`, se omite la validación (modo edición)
> - Validar un candidato completo con todos los datos correctos
>
> **Familia 2 — Guardado en base de datos (persistencia):**
> - Mockear PrismaClient siguiendo las mejores prácticas de Prisma (jest.mock)
> - Tests para `addCandidate` de `application/services/candidateService.ts`
> - Test de creación exitosa de candidato solo con datos obligatorios
> - Test de creación exitosa con candidato completo (educación, experiencia, CV)
> - Test de error por email duplicado (simular error Prisma P2002)
> - Test de propagación de errores de validación
> - Tests para los modelos de dominio (`Candidate`, `Education`, `WorkExperience`, `Resume`)
> - Verificar que `Candidate.save()` llama a `prisma.candidate.create` para nuevo candidato
> - Verificar que `Candidate.save()` llama a `prisma.candidate.update` cuando tiene id
> - Verificar que `Education.save()` y `WorkExperience.save()` persisten correctamente
> - Verificar que `Resume.save()` crea pero no permite actualizar (lanza error si tiene id)
>
> **Requisitos técnicos:**
> - Usar `jest.mock` para mockear `@prisma/client`
> - Estructura clara con `describe` anidados para cada familia y subfamilia
> - Usar `beforeEach` para resetear mocks
> - Nombres descriptivos en los tests (en español)
> - Importar solo lo necesario
> - Los tests deben pasar sin conexión a base de datos

**Objetivo**: Generar la suite completa de tests siguiendo TDD, cubriendo exhaustivamente ambas familias (validación y persistencia) con mocks de Prisma para aislamiento total de la base de datos.

**Resultado**: Se generó `backend/src/tests/tests-iniciales.test.ts` con **87 tests** organizados en 2 bloques principales:

- **Familia 1 (63 tests)**: Validación de nombres (11), email (7), teléfono (9), fecha (4), dirección (4), educación (9), experiencia laboral (9), CV (7), modo edición (2), candidato completo (2).
- **Familia 2 (24 tests)**: Servicio addCandidate (7), modelo Candidate (5), modelo Education (4), modelo WorkExperience (4), modelo Resume (3).

Se resolvió un problema de hoisting de `jest.mock`: las variables mock definidas fuera de la factory quedaban en `undefined` por la Temporal Dead Zone (TDZ) de `const`. La solución fue definir el objeto mock compartido (`sharedInstance`) **dentro** de la factory de `jest.mock` y obtener la referencia después vía `new PrismaClient()`.

---

## Prompt 5 — Ejecución y corrección de tests

> Ejecuta los tests y asegúrate de que todos pasen correctamente. Si alguno falla, corrígelo.

**Objetivo**: Verificar que la suite de tests se ejecuta sin errores, configurando Jest/ts-jest si es necesario, y corrigiendo cualquier fallo en los tests.

**Resultado**: Se configuró `jest.config.js` (se descartó `.ts` por incompatibilidad con la versión de TypeScript 4.9.5 del proyecto). Se instalaron las dependencias con `npm install`. Los 87 tests pasaron exitosamente en ~5.6 segundos sin conexión a base de datos.

---

## Metodología aplicada

### Enfoque TDD seguido:
1. **Entender** el dominio y la funcionalidad existente antes de escribir tests
2. **Identificar** los casos de prueba relevantes para ambas familias (validación + persistencia)
3. **Diseñar** los tests con estructura clara y nombres descriptivos
4. **Implementar** los tests con mocks de Prisma para aislamiento
5. **Ejecutar** y corregir hasta que todos pasen (Red -> Green)
6. **Entregar** con commit limpio y PR descriptivo

### Buenas prácticas aplicadas:
- **Aislamiento**: Mock completo de PrismaClient para no depender de BD
- **Cobertura**: Tests de casos positivos, negativos y de borde
- **Organización**: `describe` anidados por familia y subfamilia
- **Limpieza**: `beforeEach` para resetear estado entre tests
- **Legibilidad**: Nombres de tests descriptivos en español
- **Independencia**: Cada test es autónomo y puede ejecutarse solo

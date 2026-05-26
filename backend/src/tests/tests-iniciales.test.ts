// ============================================================
// Mock de PrismaClient — debe ir ANTES de los imports.
// Se define dentro de la factory para evitar problemas de
// hoisting con variables externas (TDZ).
// Todas las instancias de PrismaClient compartirán el mismo
// objeto mock, simulando una conexión única a BD.
// ============================================================
jest.mock('@prisma/client', () => {
  const sharedInstance = {
    candidate: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    education: {
      create: jest.fn(),
      update: jest.fn(),
    },
    workExperience: {
      create: jest.fn(),
      update: jest.fn(),
    },
    resume: {
      create: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => sharedInstance),
    Prisma: {
      PrismaClientInitializationError: class PrismaClientInitializationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'PrismaClientInitializationError';
        }
      },
    },
  };
});

import { PrismaClient } from '@prisma/client';
import { validateCandidateData } from '../application/validator';
import { addCandidate } from '../application/services/candidateService';
import { Candidate } from '../domain/models/Candidate';
import { Education } from '../domain/models/Education';
import { WorkExperience } from '../domain/models/WorkExperience';
import { Resume } from '../domain/models/Resume';

// Instancia compartida — es la misma que usan todos los modelos
const prisma = new PrismaClient() as any;

// ============================================================
// Datos de prueba reutilizables
// ============================================================
const candidatoValido = {
  firstName: 'María',
  lastName: 'García López',
  email: 'maria.garcia@ejemplo.com',
  phone: '612345678',
  address: 'Calle Mayor 10, Madrid',
};

const educacionValida = {
  institution: 'Universidad Complutense de Madrid',
  title: 'Ingeniería Informática',
  startDate: '2018-09-01',
  endDate: '2022-06-30',
};

const experienciaValida = {
  company: 'Tech Solutions S.L.',
  position: 'Desarrollador Full Stack',
  description: 'Desarrollo de aplicaciones web con React y Node.js',
  startDate: '2022-07-01',
  endDate: '2024-01-15',
};

const cvValido = {
  filePath: '/uploads/cv-maria-garcia.pdf',
  fileType: 'application/pdf',
};

const candidatoCompleto = {
  ...candidatoValido,
  educations: [educacionValida],
  workExperiences: [experienciaValida],
  cv: cvValido,
};

// ============================================================
// FAMILIA 1: Validación de datos (recepción del formulario)
// ============================================================
describe('Familia 1: Validación de datos del candidato', () => {
  // ----------------------------------------------------------
  // Validación de nombres (firstName y lastName)
  // ----------------------------------------------------------
  describe('Validación de nombres', () => {
    it('debe aceptar un nombre válido', () => {
      expect(() => validateCandidateData({ ...candidatoValido })).not.toThrow();
    });

    it('debe aceptar nombres con caracteres españoles (ñ, acentos)', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          firstName: 'Iñaki',
          lastName: 'Muñoz Fernández',
        }),
      ).not.toThrow();
    });

    it('debe rechazar firstName vacío', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, firstName: '' }),
      ).toThrow('Invalid name');
    });

    it('debe rechazar firstName con un solo carácter', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, firstName: 'A' }),
      ).toThrow('Invalid name');
    });

    it('debe rechazar firstName con más de 100 caracteres', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          firstName: 'A'.repeat(101),
        }),
      ).toThrow('Invalid name');
    });

    it('debe rechazar firstName con números', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, firstName: 'María123' }),
      ).toThrow('Invalid name');
    });

    it('debe rechazar firstName con caracteres especiales', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, firstName: 'María@#$' }),
      ).toThrow('Invalid name');
    });

    it('debe rechazar lastName vacío', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, lastName: '' }),
      ).toThrow('Invalid name');
    });

    it('debe rechazar lastName con un solo carácter', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, lastName: 'G' }),
      ).toThrow('Invalid name');
    });

    it('debe aceptar nombre con exactamente 2 caracteres (límite inferior)', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, firstName: 'Al' }),
      ).not.toThrow();
    });

    it('debe aceptar nombre con exactamente 100 caracteres (límite superior)', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          firstName: 'A'.repeat(100),
        }),
      ).not.toThrow();
    });
  });

  // ----------------------------------------------------------
  // Validación de email
  // ----------------------------------------------------------
  describe('Validación de email', () => {
    it('debe aceptar un email con formato válido', () => {
      expect(() => validateCandidateData({ ...candidatoValido })).not.toThrow();
    });

    it('debe aceptar email con subdominios', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          email: 'user@mail.corp.ejemplo.com',
        }),
      ).not.toThrow();
    });

    it('debe rechazar email vacío', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, email: '' }),
      ).toThrow('Invalid email');
    });

    it('debe rechazar email sin @', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          email: 'maria.garcia.ejemplo.com',
        }),
      ).toThrow('Invalid email');
    });

    it('debe rechazar email sin dominio', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, email: 'maria@' }),
      ).toThrow('Invalid email');
    });

    it('debe rechazar email sin extensión de dominio', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, email: 'maria@ejemplo' }),
      ).toThrow('Invalid email');
    });

    it('debe rechazar email con espacios', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          email: 'maria garcia@ejemplo.com',
        }),
      ).toThrow('Invalid email');
    });
  });

  // ----------------------------------------------------------
  // Validación de teléfono
  // ----------------------------------------------------------
  describe('Validación de teléfono', () => {
    it('debe aceptar teléfono móvil español válido (empieza por 6)', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: '612345678' }),
      ).not.toThrow();
    });

    it('debe aceptar teléfono móvil español válido (empieza por 7)', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: '712345678' }),
      ).not.toThrow();
    });

    it('debe aceptar teléfono fijo español válido (empieza por 9)', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: '912345678' }),
      ).not.toThrow();
    });

    it('debe aceptar teléfono vacío o undefined (campo opcional)', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: undefined }),
      ).not.toThrow();
    });

    it('debe rechazar teléfono que empieza por 1', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: '112345678' }),
      ).toThrow('Invalid phone');
    });

    it('debe rechazar teléfono con menos de 9 dígitos', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: '61234567' }),
      ).toThrow('Invalid phone');
    });

    it('debe rechazar teléfono con más de 9 dígitos', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: '6123456789' }),
      ).toThrow('Invalid phone');
    });

    it('debe rechazar teléfono con letras', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: '6abcdefgh' }),
      ).toThrow('Invalid phone');
    });

    it('debe rechazar teléfono con prefijo internacional', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, phone: '+34612345678' }),
      ).toThrow('Invalid phone');
    });
  });

  // ----------------------------------------------------------
  // Validación de fecha
  // ----------------------------------------------------------
  describe('Validación de fecha', () => {
    it('debe aceptar fecha con formato YYYY-MM-DD válido', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [educacionValida],
        }),
      ).not.toThrow();
    });

    it('debe rechazar fecha con formato DD/MM/YYYY', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ ...educacionValida, startDate: '01/09/2018' }],
        }),
      ).toThrow('Invalid date');
    });

    it('debe rechazar fecha vacía en campo obligatorio', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ ...educacionValida, startDate: '' }],
        }),
      ).toThrow('Invalid date');
    });

    it('debe rechazar fecha con formato incompleto', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ ...educacionValida, startDate: '2018-09' }],
        }),
      ).toThrow('Invalid date');
    });
  });

  // ----------------------------------------------------------
  // Validación de dirección
  // ----------------------------------------------------------
  describe('Validación de dirección', () => {
    it('debe aceptar dirección válida', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, address: 'Calle Mayor 10' }),
      ).not.toThrow();
    });

    it('debe aceptar dirección vacía o undefined (campo opcional)', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, address: undefined }),
      ).not.toThrow();
    });

    it('debe rechazar dirección con más de 100 caracteres', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          address: 'A'.repeat(101),
        }),
      ).toThrow('Invalid address');
    });

    it('debe aceptar dirección con exactamente 100 caracteres (límite)', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          address: 'A'.repeat(100),
        }),
      ).not.toThrow();
    });
  });

  // ----------------------------------------------------------
  // Validación de educación
  // ----------------------------------------------------------
  describe('Validación de educación', () => {
    it('debe aceptar educación con todos los campos válidos', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [educacionValida],
        }),
      ).not.toThrow();
    });

    it('debe aceptar educación sin endDate (campo opcional)', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [
            { institution: 'UCM', title: 'Máster', startDate: '2023-09-01' },
          ],
        }),
      ).not.toThrow();
    });

    it('debe rechazar educación sin institution', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ ...educacionValida, institution: '' }],
        }),
      ).toThrow('Invalid institution');
    });

    it('debe rechazar educación con institution de más de 100 caracteres', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ ...educacionValida, institution: 'A'.repeat(101) }],
        }),
      ).toThrow('Invalid institution');
    });

    it('debe rechazar educación sin title', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ ...educacionValida, title: '' }],
        }),
      ).toThrow('Invalid title');
    });

    it('debe rechazar educación con title de más de 100 caracteres', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ ...educacionValida, title: 'A'.repeat(101) }],
        }),
      ).toThrow('Invalid title');
    });

    it('debe rechazar educación sin startDate', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ institution: 'UCM', title: 'Grado', startDate: '' }],
        }),
      ).toThrow('Invalid date');
    });

    it('debe rechazar educación con endDate en formato inválido', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [{ ...educacionValida, endDate: 'junio-2022' }],
        }),
      ).toThrow('Invalid end date');
    });

    it('debe aceptar múltiples educaciones válidas', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          educations: [
            educacionValida,
            {
              institution: 'UAM',
              title: 'Máster en IA',
              startDate: '2022-09-01',
              endDate: '2023-06-30',
            },
          ],
        }),
      ).not.toThrow();
    });
  });

  // ----------------------------------------------------------
  // Validación de experiencia laboral
  // ----------------------------------------------------------
  describe('Validación de experiencia laboral', () => {
    it('debe aceptar experiencia con todos los campos válidos', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [experienciaValida],
        }),
      ).not.toThrow();
    });

    it('debe rechazar experiencia sin company', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [{ ...experienciaValida, company: '' }],
        }),
      ).toThrow('Invalid company');
    });

    it('debe rechazar experiencia con company de más de 100 caracteres', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [{ ...experienciaValida, company: 'A'.repeat(101) }],
        }),
      ).toThrow('Invalid company');
    });

    it('debe rechazar experiencia sin position', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [{ ...experienciaValida, position: '' }],
        }),
      ).toThrow('Invalid position');
    });

    it('debe rechazar experiencia con position de más de 100 caracteres', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [{ ...experienciaValida, position: 'A'.repeat(101) }],
        }),
      ).toThrow('Invalid position');
    });

    it('debe rechazar experiencia con description de más de 200 caracteres', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [
            { ...experienciaValida, description: 'A'.repeat(201) },
          ],
        }),
      ).toThrow('Invalid description');
    });

    it('debe aceptar experiencia con description de exactamente 200 caracteres', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [
            { ...experienciaValida, description: 'A'.repeat(200) },
          ],
        }),
      ).not.toThrow();
    });

    it('debe aceptar experiencia sin description (campo opcional)', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [
            { company: 'Empresa X', position: 'Dev', startDate: '2023-01-01' },
          ],
        }),
      ).not.toThrow();
    });

    it('debe rechazar experiencia con endDate en formato inválido', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          workExperiences: [{ ...experienciaValida, endDate: 'enero-2024' }],
        }),
      ).toThrow('Invalid end date');
    });
  });

  // ----------------------------------------------------------
  // Validación de CV
  // ----------------------------------------------------------
  describe('Validación de CV', () => {
    it('debe aceptar CV con filePath y fileType válidos', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, cv: cvValido }),
      ).not.toThrow();
    });

    it('debe aceptar candidato sin CV (campo opcional)', () => {
      expect(() => validateCandidateData({ ...candidatoValido })).not.toThrow();
    });

    it('debe aceptar CV vacío (objeto sin propiedades)', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, cv: {} }),
      ).not.toThrow();
    });

    it('debe rechazar CV sin filePath', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          cv: { fileType: 'application/pdf' },
        }),
      ).toThrow('Invalid CV data');
    });

    it('debe rechazar CV sin fileType', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          cv: { filePath: '/uploads/cv.pdf' },
        }),
      ).toThrow('Invalid CV data');
    });

    it('debe rechazar CV que no es un objeto', () => {
      expect(() =>
        validateCandidateData({ ...candidatoValido, cv: 'archivo.pdf' }),
      ).toThrow('Invalid CV data');
    });

    it('debe rechazar CV con filePath que no es string', () => {
      expect(() =>
        validateCandidateData({
          ...candidatoValido,
          cv: { filePath: 123, fileType: 'application/pdf' },
        }),
      ).toThrow('Invalid CV data');
    });
  });

  // ----------------------------------------------------------
  // Validación en modo edición (con id)
  // ----------------------------------------------------------
  describe('Validación en modo edición (con id)', () => {
    it('debe omitir toda la validación cuando se proporciona un id', () => {
      expect(() => validateCandidateData({ id: 1 })).not.toThrow();
    });

    it('debe omitir validación incluso con datos inválidos si tiene id', () => {
      expect(() =>
        validateCandidateData({
          id: 5,
          firstName: '',
          email: 'invalido',
          phone: '000',
        }),
      ).not.toThrow();
    });
  });

  // ----------------------------------------------------------
  // Validación de candidato completo
  // ----------------------------------------------------------
  describe('Validación de candidato completo', () => {
    it('debe aceptar un candidato con todos los datos válidos', () => {
      expect(() => validateCandidateData(candidatoCompleto)).not.toThrow();
    });

    it('debe aceptar candidato solo con campos obligatorios (sin opcionales)', () => {
      expect(() =>
        validateCandidateData({
          firstName: 'Ana',
          lastName: 'López',
          email: 'ana@test.com',
        }),
      ).not.toThrow();
    });
  });
});

// ============================================================
// FAMILIA 2: Guardado en base de datos (persistencia)
// ============================================================
describe('Familia 2: Guardado en base de datos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------
  // Tests del servicio addCandidate
  // ----------------------------------------------------------
  describe('Servicio addCandidate', () => {
    it('debe crear un candidato con datos obligatorios correctamente', async () => {
      const candidatoGuardado = { id: 1, ...candidatoValido };
      prisma.candidate.create.mockResolvedValue(candidatoGuardado);

      const resultado = await addCandidate({ ...candidatoValido });

      expect(prisma.candidate.create).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual(candidatoGuardado);
      expect(resultado.id).toBe(1);
    });

    it('debe crear un candidato completo con educación, experiencia y CV', async () => {
      const candidatoGuardado = { id: 1, ...candidatoValido };
      prisma.candidate.create.mockResolvedValue(candidatoGuardado);
      prisma.education.create.mockResolvedValue({ id: 1, ...educacionValida, candidateId: 1 });
      prisma.workExperience.create.mockResolvedValue({ id: 1, ...experienciaValida, candidateId: 1 });
      prisma.resume.create.mockResolvedValue({ id: 1, ...cvValido, candidateId: 1, uploadDate: new Date() });

      const resultado = await addCandidate(candidatoCompleto);

      expect(prisma.candidate.create).toHaveBeenCalledTimes(1);
      expect(prisma.education.create).toHaveBeenCalledTimes(1);
      expect(prisma.workExperience.create).toHaveBeenCalledTimes(1);
      expect(prisma.resume.create).toHaveBeenCalledTimes(1);
      expect(resultado.id).toBe(1);
    });

    it('debe lanzar error cuando el email ya existe (error Prisma P2002)', async () => {
      const errorUnico = { code: 'P2002', message: 'Unique constraint failed' };
      prisma.candidate.create.mockRejectedValue(errorUnico);

      await expect(addCandidate({ ...candidatoValido })).rejects.toThrow(
        'The email already exists in the database',
      );
    });

    it('debe propagar error de validación cuando los datos son inválidos', async () => {
      await expect(
        addCandidate({ ...candidatoValido, firstName: '' }),
      ).rejects.toThrow();

      expect(prisma.candidate.create).not.toHaveBeenCalled();
    });

    it('debe propagar errores no relacionados con email duplicado', async () => {
      const errorGenerico = new Error('Connection timeout');
      prisma.candidate.create.mockRejectedValue(errorGenerico);

      await expect(addCandidate({ ...candidatoValido })).rejects.toThrow(
        'Connection timeout',
      );
    });

    it('debe guardar múltiples educaciones cuando se proporcionan', async () => {
      prisma.candidate.create.mockResolvedValue({ id: 1, ...candidatoValido });
      prisma.education.create.mockResolvedValue({ id: 1 });

      await addCandidate({
        ...candidatoValido,
        educations: [
          educacionValida,
          { institution: 'UAM', title: 'Máster IA', startDate: '2022-09-01' },
        ],
      });

      expect(prisma.education.create).toHaveBeenCalledTimes(2);
    });

    it('debe guardar múltiples experiencias laborales cuando se proporcionan', async () => {
      prisma.candidate.create.mockResolvedValue({ id: 1, ...candidatoValido });
      prisma.workExperience.create.mockResolvedValue({ id: 1 });

      await addCandidate({
        ...candidatoValido,
        workExperiences: [
          experienciaValida,
          {
            company: 'Otra Empresa',
            position: 'Junior Dev',
            startDate: '2020-01-01',
            endDate: '2022-06-30',
          },
        ],
      });

      expect(prisma.workExperience.create).toHaveBeenCalledTimes(2);
    });
  });

  // ----------------------------------------------------------
  // Tests del modelo Candidate
  // ----------------------------------------------------------
  describe('Modelo Candidate', () => {
    it('debe llamar a prisma.candidate.create al guardar un candidato nuevo', async () => {
      const candidatoGuardado = { id: 1, ...candidatoValido };
      prisma.candidate.create.mockResolvedValue(candidatoGuardado);

      const candidato = new Candidate(candidatoValido);
      const resultado = await candidato.save();

      expect(prisma.candidate.create).toHaveBeenCalledTimes(1);
      expect(prisma.candidate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'María',
          lastName: 'García López',
          email: 'maria.garcia@ejemplo.com',
        }),
      });
      expect(resultado).toEqual(candidatoGuardado);
    });

    it('debe llamar a prisma.candidate.update cuando el candidato tiene id', async () => {
      const candidatoActualizado = { id: 1, ...candidatoValido };
      prisma.candidate.update.mockResolvedValue(candidatoActualizado);

      const candidato = new Candidate({ id: 1, ...candidatoValido });
      const resultado = await candidato.save();

      expect(prisma.candidate.update).toHaveBeenCalledTimes(1);
      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ firstName: 'María' }),
      });
      expect(resultado).toEqual(candidatoActualizado);
    });

    it('debe incluir solo campos definidos en los datos de creación', async () => {
      prisma.candidate.create.mockResolvedValue({ id: 1 });

      const candidato = new Candidate({
        firstName: 'Ana',
        lastName: 'López',
        email: 'ana@test.com',
      });
      await candidato.save();

      const datosEnviados = prisma.candidate.create.mock.calls[0][0].data;
      expect(datosEnviados.firstName).toBe('Ana');
      expect(datosEnviados.lastName).toBe('López');
      expect(datosEnviados.email).toBe('ana@test.com');
      expect(datosEnviados).not.toHaveProperty('phone');
      expect(datosEnviados).not.toHaveProperty('address');
    });

    it('debe buscar un candidato por id con findOne', async () => {
      prisma.candidate.findUnique.mockResolvedValue({ id: 1, ...candidatoValido });

      const resultado = await Candidate.findOne(1);

      expect(prisma.candidate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(resultado).toBeInstanceOf(Candidate);
      expect(resultado!.firstName).toBe('María');
    });

    it('debe retornar null si no encuentra el candidato con findOne', async () => {
      prisma.candidate.findUnique.mockResolvedValue(null);

      const resultado = await Candidate.findOne(999);

      expect(resultado).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // Tests del modelo Education
  // ----------------------------------------------------------
  describe('Modelo Education', () => {
    it('debe llamar a prisma.education.create al guardar educación nueva', async () => {
      const educacionGuardada = { id: 1, ...educacionValida, candidateId: 1 };
      prisma.education.create.mockResolvedValue(educacionGuardada);

      const educacion = new Education({ ...educacionValida, candidateId: 1 });
      const resultado = await educacion.save();

      expect(prisma.education.create).toHaveBeenCalledTimes(1);
      expect(prisma.education.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          institution: 'Universidad Complutense de Madrid',
          title: 'Ingeniería Informática',
          candidateId: 1,
        }),
      });
      expect(resultado).toEqual(educacionGuardada);
    });

    it('debe llamar a prisma.education.update cuando la educación tiene id', async () => {
      const educacionActualizada = { id: 1, ...educacionValida };
      prisma.education.update.mockResolvedValue(educacionActualizada);

      const educacion = new Education({ id: 1, ...educacionValida });
      const resultado = await educacion.save();

      expect(prisma.education.update).toHaveBeenCalledTimes(1);
      expect(prisma.education.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          institution: 'Universidad Complutense de Madrid',
        }),
      });
      expect(resultado).toEqual(educacionActualizada);
    });

    it('debe convertir startDate y endDate a objetos Date', () => {
      const educacion = new Education(educacionValida);

      expect(educacion.startDate).toBeInstanceOf(Date);
      expect(educacion.endDate).toBeInstanceOf(Date);
    });

    it('debe aceptar endDate undefined si no se proporciona', () => {
      const educacion = new Education({
        institution: 'UCM',
        title: 'Grado',
        startDate: '2023-09-01',
      });

      expect(educacion.endDate).toBeUndefined();
    });
  });

  // ----------------------------------------------------------
  // Tests del modelo WorkExperience
  // ----------------------------------------------------------
  describe('Modelo WorkExperience', () => {
    it('debe llamar a prisma.workExperience.create al guardar experiencia nueva', async () => {
      const expGuardada = { id: 1, ...experienciaValida, candidateId: 1 };
      prisma.workExperience.create.mockResolvedValue(expGuardada);

      const experiencia = new WorkExperience({ ...experienciaValida, candidateId: 1 });
      const resultado = await experiencia.save();

      expect(prisma.workExperience.create).toHaveBeenCalledTimes(1);
      expect(prisma.workExperience.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          company: 'Tech Solutions S.L.',
          position: 'Desarrollador Full Stack',
          candidateId: 1,
        }),
      });
      expect(resultado).toEqual(expGuardada);
    });

    it('debe llamar a prisma.workExperience.update cuando tiene id', async () => {
      const expActualizada = { id: 1, ...experienciaValida };
      prisma.workExperience.update.mockResolvedValue(expActualizada);

      const experiencia = new WorkExperience({ id: 1, ...experienciaValida });
      const resultado = await experiencia.save();

      expect(prisma.workExperience.update).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual(expActualizada);
    });

    it('debe convertir startDate y endDate a objetos Date', () => {
      const experiencia = new WorkExperience(experienciaValida);

      expect(experiencia.startDate).toBeInstanceOf(Date);
      expect(experiencia.endDate).toBeInstanceOf(Date);
    });

    it('debe aceptar endDate undefined si no se proporciona', () => {
      const experiencia = new WorkExperience({
        company: 'Test',
        position: 'Dev',
        startDate: '2023-01-01',
      });

      expect(experiencia.endDate).toBeUndefined();
    });
  });

  // ----------------------------------------------------------
  // Tests del modelo Resume
  // ----------------------------------------------------------
  describe('Modelo Resume', () => {
    it('debe llamar a prisma.resume.create al guardar un CV nuevo', async () => {
      const cvGuardado = { id: 1, ...cvValido, candidateId: 1, uploadDate: new Date() };
      prisma.resume.create.mockResolvedValue(cvGuardado);

      const resume = new Resume({ ...cvValido, candidateId: 1 });
      const resultado = await resume.save();

      expect(prisma.resume.create).toHaveBeenCalledTimes(1);
      expect(prisma.resume.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          filePath: '/uploads/cv-maria-garcia.pdf',
          fileType: 'application/pdf',
          candidateId: 1,
        }),
      });
      expect(resultado).toBeDefined();
    });

    it('debe lanzar error al intentar actualizar un CV existente (tiene id)', async () => {
      const resume = new Resume({ id: 1, ...cvValido, candidateId: 1 });

      await expect(resume.save()).rejects.toThrow(
        'No se permite la actualización de un currículum existente.',
      );
      expect(prisma.resume.create).not.toHaveBeenCalled();
    });

    it('debe asignar uploadDate automáticamente al crear', () => {
      const resume = new Resume(cvValido);

      expect(resume.uploadDate).toBeInstanceOf(Date);
    });
  });
});

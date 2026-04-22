const jwt = require('jsonwebtoken');

// Mock del modelo User ANTES de importar el middleware
jest.mock('../models/User');
const User = require('../models/User');

const auth = require('../middleware/auth');

// Configurar JWT_SECRET para los tests
process.env.JWT_SECRET = 'test_secret_key';

// Helper: crea objetos req, res, next falsos
const mockReqResNext = (authHeader = undefined) => {
  const req = {
    header: jest.fn((name) => {
      if (name === 'Authorization') return authHeader;
    }),
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

// =============================================================
// PRUEBA 1: Token válido → acceso permitido (next() se llama)
// =============================================================
describe('Auth Middleware', () => {

  test('Prueba 1 - Token válido: permite el acceso y adjunta el usuario a req', async () => {
    // Arrange: creamos un token real firmado con el secret de test
    const payload = { id: 1 };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    const usuarioFalso = { id: 1, nombre: 'Juan', activo: true, rol: 'estudiante' };
    User.findOne.mockResolvedValue(usuarioFalso); // simulamos que la BD devuelve un usuario

    const { req, res, next } = mockReqResNext(`Bearer ${token}`);

    // Act
    await auth(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);         // se llama next() → acceso permitido
    expect(req.user).toEqual(usuarioFalso);         // el usuario queda en req.user
    expect(res.status).not.toHaveBeenCalled();      // no se devuelve ningún error
  });

  // =============================================================
  // PRUEBA 2: Sin token → error 401
  // =============================================================
  test('Prueba 2 - Sin token: retorna 401 con mensaje de error', async () => {
    // Arrange: sin header Authorization
    const { req, res, next } = mockReqResNext(undefined);

    // Act
    await auth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No se proporcionó token de autenticación',
    });
    expect(next).not.toHaveBeenCalled(); // NO se avanza a la siguiente ruta
  });

  // =============================================================
  // PRUEBA 3: Token inválido (firmado con otro secret) → error 401
  // =============================================================
  test('Prueba 3 - Token inválido: retorna 401 con "Token inválido"', async () => {
    // Arrange: token firmado con un secret DIFERENTE al del servidor
    const tokenInvalido = jwt.sign({ id: 1 }, 'secret_incorrecto');
    const { req, res, next } = mockReqResNext(`Bearer ${tokenInvalido}`);

    // Act
    await auth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

});
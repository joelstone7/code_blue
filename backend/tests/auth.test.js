const jwt = require('jsonwebtoken');

jest.mock('../models/User');
const User = require('../models/User');

const auth = require('../middleware/auth');

process.env.JWT_SECRET = 'test_secret_key';

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

// PRUEBA 1: Token válido → acceso permitido
describe('Auth Middleware', () => {

  test('Prueba 1 - Token válido: permite el acceso y adjunta el usuario a req', async () => {
    const payload = { id: 1 };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    const usuarioFalso = { id: 1, nombre: 'Juan', activo: true, rol: 'estudiante' };
    User.findOne.mockResolvedValue(usuarioFalso); 

    const { req, res, next } = mockReqResNext(`Bearer ${token}`);

    
    await auth(req, res, next);

    
    expect(next).toHaveBeenCalledTimes(1);         
    expect(req.user).toEqual(usuarioFalso);         
    expect(res.status).not.toHaveBeenCalled();      
  });

  // PRUEBA 2: Sin token → error 401
  test('Prueba 2 - Sin token: retorna 401 con mensaje de error', async () => {
    const { req, res, next } = mockReqResNext(undefined);

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No se proporcionó token de autenticación',
    });
    expect(next).not.toHaveBeenCalled();
  });

  
  // PRUEBA 3: Token inválido (firmado con otro secret) 

  test('Prueba 3 - Token inválido: retorna 401 con "Token inválido"', async () => {
    const tokenInvalido = jwt.sign({ id: 1 }, 'secret_incorrecto');
    const { req, res, next } = mockReqResNext(`Bearer ${tokenInvalido}`);

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  // PRUEBA 4: Token válido pero usuario no existe en BD 
test('Prueba 4 - Usuario no encontrado: retorna 401 con mensaje de error', async () => {
  const token = jwt.sign({ id: 99 }, process.env.JWT_SECRET);
  
  User.findOne.mockResolvedValue(null);

  const { req, res, next } = mockReqResNext(`Bearer ${token}`);

  await auth(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    error: 'Usuario no encontrado o inactivo',
  });
  expect(next).not.toHaveBeenCalled();
});

});
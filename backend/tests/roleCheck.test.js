const roleCheck = require('../middleware/roleCheck');

// Helper: crea req con usuario simulado, res y next
const mockReqResNext = (user = undefined) => {
  const req = { user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

// =============================================================
// PRUEBA 4: Rol correcto → acceso permitido
// =============================================================
describe('RoleCheck Middleware', () => {

  test('Prueba 4 - Rol permitido: llama a next() y permite el acceso', () => {
    // Arrange: usuario con rol 'docente', ruta permite ['docente', 'admin']
    const { req, res, next } = mockReqResNext({ id: 2, rol: 'docente' });
    const middleware = roleCheck('docente', 'admin');

    // Act
    middleware(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // =============================================================
  // PRUEBA 5: Rol incorrecto → error 403 Forbidden
  // =============================================================
  test('Prueba 5 - Rol no permitido: retorna 403 con el rol requerido', () => {
    // Arrange: usuario con rol 'estudiante' quiere acceder a ruta solo para 'docente'
    const { req, res, next } = mockReqResNext({ id: 3, rol: 'estudiante' });
    const middleware = roleCheck('docente', 'admin');

    // Act
    middleware(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No tienes permisos para realizar esta acción',
      requiredRole: ['docente', 'admin'],
      userRole: 'estudiante',
    });
    expect(next).not.toHaveBeenCalled();
  });

  // =============================================================
  // PRUEBA 6: Sin usuario en req → error 401
  // =============================================================
  test('Prueba 6 - Sin usuario autenticado: retorna 401', () => {
    // Arrange: req.user no existe (alguien saltó el middleware auth)
    const { req, res, next } = mockReqResNext(undefined);
    const middleware = roleCheck('docente');

    // Act
    middleware(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no autenticado' });
    expect(next).not.toHaveBeenCalled();
  });
});
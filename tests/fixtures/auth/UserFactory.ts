/**
 * UserFactory - Factory para crear usuarios de test
 *
 * Maneja la creación y limpieza de usuarios temporales para tests:
 * - Genera usuarios únicos
 * - Mantiene registro para limpieza
 * - Proporciona usuarios seed existentes
 */

export interface TestUser {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role: 'locador' | 'locatario' | 'ambos';
  id?: string;
}

export class UserFactory {
  private static counter = 0;
  private createdUsers: TestUser[] = [];

  /**
   * Usuarios seed pre-existentes en la base de datos
   * Útiles para tests que no requieren usuarios nuevos
   */
  private readonly SEED_USERS = {
    owner: {
      email: 'owner.test@autorentar.com',
      password: 'TestOwner123!',
      fullName: 'Test Owner',
      phone: '+5491123456789',
      role: 'locador' as const
    },
    renter: {
      email: 'renter.test@autorentar.com',
      password: 'TestRenter123!',
      fullName: 'Test Renter',
      phone: '+5491123456788',
      role: 'locatario' as const
    },
    both: {
      email: 'both.test@autorentar.com',
      password: 'TestBoth123!',
      fullName: 'Test Both',
      phone: '+5491123456787',
      role: 'ambos' as const
    },
    // Usuario real proporcionado por el usuario (para tests específicos)
    realOwner: {
      email: 'Ecucondor@gmail.com',
      password: 'Ab.12345',
      fullName: 'Eduardo',
      role: 'locador' as const
    }
  };

  /**
   * Crea un usuario único para test
   */
  createUser(role: 'locador' | 'locatario' | 'ambos' = 'locatario'): TestUser {
    const timestamp = Date.now();
    const counter = UserFactory.counter++;
    const uniqueId = `${timestamp}-${counter}`;

    const user: TestUser = {
      email: `test.${role}.${uniqueId}@autorentar.test`,
      password: `Test${role.charAt(0).toUpperCase()}${uniqueId.slice(-6)}!`,
      fullName: `Test ${role} ${counter}`,
      phone: `+549${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role
    };

    this.createdUsers.push(user);
    return user;
  }

  /**
   * Crea un usuario owner (locador) único
   */
  createOwner(): TestUser {
    return this.createUser('locador');
  }

  /**
   * Crea un usuario renter (locatario) único
   */
  createRenter(): TestUser {
    return this.createUser('locatario');
  }

  /**
   * Crea un usuario con ambos roles
   */
  createDualUser(): TestUser {
    return this.createUser('ambos');
  }

  /**
   * Obtiene un usuario seed pre-existente
   */
  getSeedUser(type: 'owner' | 'renter' | 'both' | 'realOwner'): TestUser {
    return { ...this.SEED_USERS[type] };
  }

  /**
   * Obtiene un usuario owner seed
   */
  getSeedOwner(): TestUser {
    return this.getSeedUser('owner');
  }

  /**
   * Obtiene un usuario renter seed
   */
  getSeedRenter(): TestUser {
    return this.getSeedUser('renter');
  }

  /**
   * Obtiene el usuario real para tests específicos
   */
  getRealOwner(): TestUser {
    return this.getSeedUser('realOwner');
  }

  /**
   * Genera datos de usuario aleatorios
   */
  generateUserData(role: 'locador' | 'locatario' | 'ambos' = 'locatario'): Partial<TestUser> {
    const randomId = Math.random().toString(36).substring(2, 8);
    return {
      fullName: `Test User ${randomId}`,
      phone: `+549${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role
    };
  }

  /**
   * Obtiene la lista de usuarios creados
   */
  getCreatedUsers(): TestUser[] {
    return [...this.createdUsers];
  }

  /**
   * Limpia el registro de usuarios creados
   * Nota: Este método NO elimina usuarios de la BD,
   * solo limpia el registro interno
   */
  clearRegistry(): void {
    this.createdUsers = [];
  }

  /**
   * Marca un usuario como creado exitosamente con su ID
   */
  markAsCreated(user: TestUser, id: string): void {
    const index = this.createdUsers.findIndex(u => u.email === user.email);
    if (index !== -1) {
      this.createdUsers[index].id = id;
    }
  }

  /**
   * Verifica si un email ya está en uso
   */
  isEmailInUse(email: string): boolean {
    return this.createdUsers.some(u => u.email === email);
  }

  /**
   * Genera un email único garantizado
   */
  generateUniqueEmail(role: string = 'test'): string {
    let email: string;
    do {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 6);
      email = `test.${role}.${timestamp}.${random}@autorentar.test`;
    } while (this.isEmailInUse(email));
    return email;
  }

  /**
   * Obtiene estadísticas de usuarios creados
   */
  getStats(): {
    total: number;
    byRole: Record<string, number>;
  } {
    const stats = {
      total: this.createdUsers.length,
      byRole: {
        locador: 0,
        locatario: 0,
        ambos: 0
      }
    };

    this.createdUsers.forEach(user => {
      stats.byRole[user.role]++;
    });

    return stats;
  }
}
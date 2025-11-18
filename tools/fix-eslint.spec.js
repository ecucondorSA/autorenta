/**
 * Tests para fix-eslint.js
 *
 * NOTA: Estos son tests básicos para las transformaciones regex.
 * El script completo es difícil de testear por diseño (ejecuta npm, I/O directo).
 * Futuro: Refactorizar para mejor testabilidad.
 */

const assert = require('assert');

// Funciones extraídas para testing
function fixCatchError(content) {
  return content.replace(/catch\s*\(\s*error\s*\)/g, 'catch (_error)');
}

function fixCatchErr(content) {
  return content.replace(/catch\s*\(\s*err\s*\)/g, 'catch (_err)');
}

function fixCatchE(content) {
  return content.replace(/catch\s*\(\s*e\s*\)/g, 'catch (_e)');
}

function fixAnyToUnknown(content) {
  return content.replace(/:\s*any(?=[,;\)\]])/g, ': unknown');
}

function fixEmptyObjectType(content) {
  return content.replace(/:\s*{}\s*(?=[,;\)\]])/g, ': object');
}

// Tests (formato Mocha/Jest - comentados para ejecución directa con Node)
// Para usar con test runner: npm test tools/fix-eslint.spec.js
//
// describe('fix-eslint.js transformations', () => {
//   describe('fixCatchError', () => {
//     it('should prefix unused error variable with underscore', () => {
//       assert.strictEqual(fixCatchError('try { } catch (error) { }'), 'try { } catch (_error) { }');
//     });
//     ...
//   });
// });

// Run tests if executed directly
if (require.main === module) {
  console.log('Running fix-eslint.js tests...\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    // fixCatchError
    () => {
      try {
        assert.strictEqual(fixCatchError('catch (error)'), 'catch (_error)');
        console.log('✅ fixCatchError: basic');
        passed++;
      } catch (e) {
        console.log('❌ fixCatchError: basic -', e.message);
        failed++;
      }
    },
    // fixCatchErr
    () => {
      try {
        assert.strictEqual(fixCatchErr('catch (err)'), 'catch (_err)');
        console.log('✅ fixCatchErr: basic');
        passed++;
      } catch (e) {
        console.log('❌ fixCatchErr: basic -', e.message);
        failed++;
      }
    },
    // fixCatchE
    () => {
      try {
        assert.strictEqual(fixCatchE('catch (e)'), 'catch (_e)');
        console.log('✅ fixCatchE: basic');
        passed++;
      } catch (e) {
        console.log('❌ fixCatchE: basic -', e.message);
        failed++;
      }
    },
    // fixAnyToUnknown
    () => {
      try {
        assert.strictEqual(fixAnyToUnknown('param: any)'), 'param: unknown)');
        console.log('✅ fixAnyToUnknown: parameter');
        passed++;
      } catch (e) {
        console.log('❌ fixAnyToUnknown: parameter -', e.message);
        failed++;
      }
    },
    () => {
      try {
        assert.strictEqual(fixAnyToUnknown('const x: any;'), 'const x: unknown;');
        console.log('✅ fixAnyToUnknown: variable');
        passed++;
      } catch (e) {
        console.log('❌ fixAnyToUnknown: variable -', e.message);
        failed++;
      }
    },
    () => {
      try {
        assert.strictEqual(fixAnyToUnknown('const anyValue = 123'), 'const anyValue = 123');
        console.log('✅ fixAnyToUnknown: should not replace in other contexts');
        passed++;
      } catch (e) {
        console.log('❌ fixAnyToUnknown: should not replace -', e.message);
        failed++;
      }
    },
    // fixEmptyObjectType
    () => {
      try {
        assert.strictEqual(fixEmptyObjectType('const x: {};'), 'const x: object;');
        console.log('✅ fixEmptyObjectType: variable');
        passed++;
      } catch (e) {
        console.log('❌ fixEmptyObjectType: variable -', e.message);
        failed++;
      }
    },
    () => {
      try {
        assert.strictEqual(fixEmptyObjectType('const obj = {};'), 'const obj = {};');
        console.log('✅ fixEmptyObjectType: should not replace object literals');
        passed++;
      } catch (e) {
        console.log('❌ fixEmptyObjectType: should not replace -', e.message);
        failed++;
      }
    },
  ];

  tests.forEach(test => test());

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = {
  fixCatchError,
  fixCatchErr,
  fixCatchE,
  fixAnyToUnknown,
  fixEmptyObjectType,
};

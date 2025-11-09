# 🛡️ Rate Limiting - ISSUE #1

**Fecha**: 2025-11-09  
**Issue**: [#1](https://github.com/ecucondorSA/autorenta/issues/1)  
**Estado**: ⏳ Pendiente (requiere Cloudflare Pro)

---

## 📋 Requisitos

### Upgrade a Cloudflare Pro

**Costo**: $20/mes  
**Beneficios**:
- Rate limiting rules
- WAF avanzado
- Bot management
- Analytics mejorados

**Pasos**:
1. Ir a: https://dash.cloudflare.com/
2. Seleccionar cuenta
3. Billing → Upgrade to Pro
4. Completar pago

---

## 🔧 Configuración de Rate Limiting Rules

### Ubicación

**Cloudflare Dashboard** → **Security** → **WAF** → **Rate limiting rules**

### Regla 1: Login Brute Force Protection

**Configuración**:
- **Match**: 
  - URL contains: `/auth/v1/token`
  - Method: `POST`
- **Rate**: 
  - Requests: `5`
  - Period: `10 minutes`
  - Per: `IP address`
- **Action**: 
  - Block for: `1 hour`
- **Bypass**: 
  - None (aplicar a todos)

**Justificación**: Previene ataques de fuerza bruta en login

---

### Regla 2: API Protection

**Configuración**:
- **Match**: 
  - URL contains: `/rest/v1/`
  - Method: `POST, PUT, DELETE`
- **Rate**: 
  - Requests: `100`
  - Period: `1 minute`
  - Per: `IP address`
- **Action**: 
  - Managed Challenge (CAPTCHA) for: `10 minutes`
- **Bypass**: 
  - None

**Justificación**: Protege API de abuso y DDoS

---

### Regla 3: Password Reset Protection

**Configuración**:
- **Match**: 
  - URL contains: `/auth/v1/recover`
  - Method: `POST`
- **Rate**: 
  - Requests: `3`
  - Period: `1 hour`
  - Per: `IP address`
- **Action**: 
  - Block for: `2 hours`
- **Bypass**: 
  - None

**Justificación**: Previene spam de password reset

---

## ⚙️ Security Settings Adicionales

**Security** → **Settings**:

- ✅ **Bot Fight Mode**: ON
- ✅ **Browser Integrity Check**: ON
- ✅ **Security Level**: Medium
- ✅ **Challenge Passage**: 30 minutes

---

## ✅ Verificación

Después de configurar:

1. **Verificar reglas activas**:
   - Security → WAF → Rate limiting rules
   - Debe mostrar 3 reglas activas

2. **Test de rate limiting**:
   ```bash
   # Intentar login 6 veces rápidamente desde misma IP
   # Debe bloquear después de 5 intentos
   ```

3. **Verificar logs**:
   - Security → Events
   - Debe mostrar eventos de rate limiting

---

## 📊 Monitoreo

### Métricas a Revisar

- **Rate limit triggers**: Security → Analytics
- **False positives**: Revisar logs semanalmente
- **Blocked IPs**: Security → Firewall Rules

### Ajustes Recomendados

Si hay muchos false positives:
- Aumentar límite de requests
- Agregar bypass para IPs conocidas
- Ajustar periodo de bloqueo

---

## 🔗 Referencias

- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Cloudflare WAF](https://developers.cloudflare.com/waf/)
- Issue template: `.github/issues/issue-1-day-1.md`

---

## ✅ Checklist

- [ ] Cloudflare Pro activo
- [ ] Regla 1: Login Brute Force creada
- [ ] Regla 2: API Protection creada
- [ ] Regla 3: Password Reset creada
- [ ] Security settings configurados
- [ ] Rate limiting verificado con tests
- [ ] Logs monitoreados


# 🚀 Instagram Setup - Instrucciones Rápidas

## Objetivo: Obtener 3 Valores

### ✅ VALOR 1: Business Account ID (18-22 dígitos, empieza con 178)

1. Abre: https://developers.facebook.com/apps/4435998730015502/use_cases/customize/?use_case_enum=INSTAGRAM_BUSINESS
2. Busca la sección: "Configuração da API com login do Facebook"
3. Copia el número que empieza con 178 (~20 dígitos)

**Ejemplo:** 17841402937654321

---

### ✅ VALOR 2: Page ID (13-16 dígitos)

La página AutoRenta fue creada. Para obtener el Page ID:

**Opción A - Más fácil:**
1. Abre la URL: https://graph.instagram.com/me?fields=name,ig_user_id&access_token=TU_TOKEN
2. O ve a: https://developers.facebook.com/tools/explorer/
3. Selecciona tu app
4. Haz query: `me?fields=ig_user_id`

**Opción B - Desde la página:**
1. Ve a: https://www.facebook.com/auto.rentar/about/
2. Busca "Page ID" en la información

**Ejemplo:** 123456789012345

---

### ✅ VALOR 3: Access Token (>100 caracteres, empieza con IGQVJYd...)

1. Abre: https://developers.facebook.com/apps/4435998730015502/use_cases/customize/?use_case_enum=INSTAGRAM_BUSINESS
2. Ve a la sección: "2. Gerar tokens de acesso"
3. Haz clic en: "Adicionar conta"
4. Selecciona la cuenta de Instagram @auto.rentar
5. Copia el token largo

**Ejemplo:** IGQVJYd3F0RWM_vI8Wh0dHNoWDJPNWVpaDZAKd3dNU...

---

## Una vez tengas los 3 valores:

```bash
bun scripts/instagram-setup-interactive.ts
```

El script te pedirá cada valor uno por uno. Pégalos cuando se pida.

---

**Tiempo total:** 5-10 minutos

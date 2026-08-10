// Static legal copy served by the backend so it can be updated without a
// frontend deploy. This is a STANDARD, EDITABLE template — NOT reviewed by a
// lawyer. Replace the placeholders (company name / contact) and have it
// reviewed before production launch.

export type LegalLang = 'es' | 'en';

const COMPANY = 'FreeMatch';
const CONTACT_ES = 'privacidad@freematch.app';
const CONTACT_EN = 'privacy@freematch.app';
const EFFECTIVE_ES = '10 de agosto de 2026';
const EFFECTIVE_EN = 'August 10, 2026';

// ── Privacy Policy ──────────────────────────────────────────────────────────

export function privacyPolicy(lang: LegalLang): string {
  return lang === 'en'
    ? `${enTitle('Privacy Policy')}

Effective date: ${EFFECTIVE_EN}

${COMPANY} ("we", "us") operates a dating application that lets you create a
profile, discover other people, and chat with matches. This Privacy Policy
explains what data we collect, why we collect it, and the choices you have.

1. DATA WE COLLECT
- Account data: name, email, date of birth, gender and preferences you enter.
- Profile data: photos, bio, location/region, and interests you add.
- Usage data: swipes, matches, and messages you send or receive.
- Technical data: device type, OS, app version, and basic diagnostics, to keep
  the service working.

We only use your approximate city/region (never continuous location tracking)
so other users can see roughly where you are. We do not collect precise
real-time background location.

2. HOW WE USE YOUR DATA
- To create and manage your account and let you match and chat with others.
- To personalise who you see.
- To moderate uploaded photos (automatic adult-content filtering).
- To keep the service safe, diagnose problems, and prevent abuse.

3. SHARING
We do not sell your personal data. Your profile, photos, bio and approximate
region are shown to other users so they can decide whether to match with you.
We may share data with the technical providers that host and operate the app
(e.g. cloud storage for photos) only to provide the service.

4. RETENTION
We keep your data while your account is active. If you delete your account, we
delete your profile and the personal data associated with it, except where law
requires us to keep limited records.

5. YOUR RIGHTS
You can edit your profile at any time. You can delete your account and all of
your data from within the app ("delete account"). Depending on where you live,
you may also have rights to access, correct, export, or object to processing of
your data. Contact us at ${CONTACT_EN} to exercise them.

6. CHILDREN
The app is only for people aged 18 or over. We do not knowingly collect data
from minors.

7. CHANGES
We may update this policy. The current version will always be available here,
and we will notify you of significant changes in the app.

8. CONTACT
Questions about this policy: ${CONTACT_EN}.`
    : `${esTitle('Política de Privacidad')}

Fecha de vigencia: ${EFFECTIVE_ES}

${COMPANY} ("nosotros") opera una aplicación de citas que te permite crear un
perfil, descubrir otras personas y chatear con tus matches. Esta Política de
Privacidad explica qué datos recopilamos, por qué, y las opciones que tenés.

1. DATOS QUE RECOPILAMOS
- Datos de cuenta: nombre, email, fecha de nacimiento, género y preferencias
  que ingresás.
- Datos de perfil: fotos, bio, ubicación/región e intereses que agregás.
- Datos de uso: swipes, matches y mensajes que enviás o recibís.
- Datos técnicos: tipo de dispositivo, sistema operativo, versión de la app y
  diagnósticos básicos, para que el servicio funcione.

Solo usamos tu ciudad/región aproximada (nunca rastreo continuo de ubicación)
para que otras personas vean más o menos dónde estás. No recopilamos tu
ubicación precisa de fondo en tiempo real.

2. CÓMO USAMOS TUS DATOS
- Para crear y gestionar tu cuenta y permitirte hacer match y chatear.
- Para personalizar a quién ves.
- Para moderar las fotos subidas (filtro automático de contenido adulto).
- Para mantener el servicio seguro, diagnosticar errores y evitar abusos.

3. COMPARTIR
No vendemos tus datos personales. Tu perfil, fotos, bio y región aproximada se
muestran a otras personas para que decidan si quieren hacer match con vos.
Podemos compartir datos con los proveedores técnicos que alojan y operan la app
(por ejemplo, almacenamiento en la nube para las fotos) solo para prestar el
servicio.

4. RETENCIÓN
Guardamos tus datos mientras tu cuenta esté activa. Si eliminás tu cuenta,
borramos tu perfil y los datos personales asociados, salvo que la ley nos exija
conservar registros limitados.

5. TUS DERECHOS
Podés editar tu perfil cuando quieras. Podés eliminar tu cuenta y todos tus
datos desde la app ("eliminar cuenta"). Según dónde vivas, también podés tener
derecho a acceder, corregir, exportar u oponerte al tratamiento de tus datos.
Contactanos en ${CONTACT_ES} para ejercerlos.

6. MENORES
La app es solo para personas mayores de 18 años. No recopilamos datos de
menores a sabiendas.

7. CAMBIOS
Podemos actualizar esta política. La versión vigente siempre estará disponible
acá, y te notificaremos los cambios importantes dentro de la app.

8. CONTACTO
Consultas sobre esta política: ${CONTACT_ES}.`;
}

// ── Terms of Service ────────────────────────────────────────────────────────

export function termsOfService(lang: LegalLang): string {
  return lang === 'en'
    ? `${enTitle('Terms of Service')}

Effective date: ${EFFECTIVE_EN}

Welcome to ${COMPANY}. By creating an account and using the app you agree to
these terms.

1. ELIGIBILITY
You must be at least 18 years old to use ${COMPANY}. By registering you confirm
that you meet this requirement.

2. YOUR ACCOUNT
You are responsible for keeping your login credentials safe. You may not create
accounts for other people without their consent, or create fake or misleading
profiles.

3. BEHAVIOR
We expect you to treat other users with respect. You may not use the app to
harass, threaten, or harm others, to post illegal content, to solicit money, or
to use the service for any unlawful purpose. We may remove content or suspend
accounts that violate these rules.

4. CONTENT YOU POST
You keep ownership of the content you post (photos, bio). By posting it you
grant us a limited licence to display it within the app so we can provide the
service. You promise the content is yours to post and does not violate anyone's
rights.

5. TERMINATION
You can delete your account at any time. We may suspend or delete your account
if you breach these terms.

6. DISCLAIMER
The service is provided "as is". We do not guarantee specific matches or
outcomes, and we are not responsible for the conduct of other users. Use the
app at your own risk and take reasonable care when meeting people in person.

7. LIMITATION OF LIABILITY
To the maximum extent permitted by law, ${COMPANY} is not liable for indirect
or consequential damages arising from your use of the app.

8. CHANGES
We may update these terms from time to time. Continued use of the app after
changes means you accept the updated terms.

9. CONTACT
Questions: ${CONTACT_EN}.`
    : `${esTitle('Términos de Servicio')}

Fecha de vigencia: ${EFFECTIVE_ES}

Bienvenido/a a ${COMPANY}. Al crear una cuenta y usar la app aceptás estos
términos.

1. REQUISITOS
Debés tener al menos 18 años para usar ${COMPANY}. Al registrarte confirmás que
cumplís este requisito.

2. TU CUENTA
Sos responsable de mantener a salvo tus credenciales de acceso. No podés crear
cuentas para otras personas sin su consentimiento, ni perfiles falsos o
engañosos.

3. COMPORTAMIENTO
Esperamos que trates a los demás con respeto. No podés usar la app para acosar,
amenazar o dañar a otros, publicar contenido ilegal, solicitar dinero ni usar el
servicio con fines ilícitos. Podemos eliminar contenido o suspender cuentas que
violen estas reglas.

4. CONTENIDO QUE PUBLICÁS
Mantenés la titularidad del contenido que publicás (fotos, bio). Al publicarlo
nos otorgás una licencia limitada para mostrarlo dentro de la app y poder
prestarte el servicio. Declarás que el contenido es tuyo y no viola derechos de
nadie.

5. TERMINACIÓN
Podés eliminar tu cuenta cuando quieras. Podemos suspender o eliminar tu cuenta
si incumplís estos términos.

6. LIMITACIÓN DE RESPONSABILIDAD
En la máxima medida permitida por la ley, ${COMPANY} no es responsable por daños
indirectos o consecuentes que surjan del uso de la app.

7. CAMBIOS
Podemos actualizar estos términos de vez en cuando. El uso continuado de la app
después de los cambios implica que aceptás los términos actualizados.

8. CONTACTO
Consultas: ${CONTACT_ES}.`;
}

// Build a plain-text title line (no markdown) with a following blank line.
function enTitle(t: string): string {
  return t;
}
function esTitle(t: string): string {
  return t;
}

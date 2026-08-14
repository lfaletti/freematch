import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'es' | 'en';

const STORAGE_KEY = 'freematch_language';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

const es = {
  translation: {
    // ── Common ──
    common: {
      cancel: 'Cancelar',
      save: 'Guardar',
      back: '← Volver',
      error: 'Error',
      success: 'Éxito',
      required: '*',
      optional: 'opcional',
    },
    gender: {
      man: 'Hombre',
      woman: 'Mujer',
      other: 'Otro',
      iAm: 'Soy',
      interestedIn: 'Me interesan',
    },
    language: {
      label: 'Idioma',
      es: 'Español',
      en: 'English',
    },

    // ── Legal ──
    legal: {
      privacy: 'Política de Privacidad',
      terms: 'Términos de Servicio',
    },

    // ── Welcome ──
    welcome: {
      title: 'FreeMatch',
      tagline: 'Encontrá tu chispa',
      subtitle: 'Encontrá a tu persona ideal',
      createAccount: 'Crear cuenta',
      login: 'Iniciar sesión',
      disclaimerPrefix: 'Al continuar aceptás nuestros',
      disclaimerAnd: 'y nuestra',
      disclaimerSuffix: '.',
    },

    // ── Create Account ──
    createAccount: {
      title: 'Creá tu perfil',
      subtitle: 'Te preparamos todo',
      photos: 'Fotos',
      addAtLeastOne: 'Agregá al menos una foto. La primera es tu foto principal.',
      addPhoto: 'Agregar foto',
      removePhoto: 'Eliminar foto',
      main: 'PRINCIPAL',
      name: 'Nombre',
      namePlaceholder: 'Tu nombre',
      email: 'Email',
      emailPlaceholder: 'vos@ejemplo.com',
      password: 'Contraseña',
      passwordPlaceholder: 'Al menos 6 caracteres',
      confirmPassword: 'Confirmar contraseña',
      confirmPasswordPlaceholder: 'Repetí tu contraseña',
      dateOfBirth: 'Fecha de nacimiento',
      dateOfBirthPlaceholder: 'AAAA-MM-DD',
      aboutYou: 'Sobre vos',
      aboutYouPlaceholder: 'Escribí una bio corta…',
      createAccount: 'Crear cuenta',
      alreadyHaveAccount: '¿Ya tenés una cuenta?',
      logIn: 'Iniciar sesión',
      permissionNeeded: 'Permiso requerido',
      permissionMessage: 'Permití el acceso a tu galería de fotos.',
      registrationFailed: 'El registro falló. Intentá de nuevo.',
      // validation messages
      errPhoto: 'Agregá al menos una foto.',
      errName: 'El nombre es obligatorio.',
      errEmail: 'El email es obligatorio.',
      errEmailFormat: 'Ingresá un email válido.',
      errPassword: 'La contraseña es obligatoria.',
      errPasswordLength: 'La contraseña debe tener al menos 6 caracteres.',
      errPasswordMatch: 'Las contraseñas no coinciden.',
      errBornDate: 'La fecha de nacimiento es obligatoria.',
      errBornDateFormat: 'La fecha de nacimiento debe tener formato AAAA-MM-DD.',
      errBornDateInvalid: 'La fecha de nacimiento no es válida.',
      errUnder18: 'Debés tener al menos 18 años.',
      errAgeInvalid: 'Ingresá una fecha de nacimiento válida.',
      errGender: 'Seleccioná tu género.',
      errSeeking: 'Seleccioná al menos un género que te interese.',
      errEmailTaken: 'Ese email ya está vinculado a una cuenta.',
      // legal consent
      legalPrefix: 'Acepto la',
      legalAnd: 'y los',
      legalSuffix: 'para crear mi cuenta.',
      errLegal: 'Debés aceptar la Política de Privacidad y los Términos de Servicio para crear tu cuenta.',
    },

    // ── Login ──
    login: {
      title: 'Iniciar sesión',
      welcomeBack: 'Bienvenido de nuevo',
      subtitle: 'Iniciá sesión con tu email',
      email: 'Email',
      emailPlaceholder: 'vos@ejemplo.com',
      password: 'Contraseña',
      passwordPlaceholder: 'Ingresá tu contraseña',
      login: 'Iniciar sesión',
      needAccount: '¿No tenés cuenta?',
      createOne: 'Crear una',
      success: '¡Sesión iniciada!',
      err: 'No se pudo iniciar sesión. Verificá tus datos.',
      errEmail: 'Ingresá tu email.',
      errPassword: 'Ingresá tu contraseña.',
      errInvalid: 'El email o la contraseña son incorrectos.',
      errNoAccount: 'No se encontró ninguna cuenta con ese email.',
      errNetwork: 'No se pudo iniciar sesión. Revisá tu conexión e intentá de nuevo.',
    },

    // ── Edit Profile ──
    editProfile: {
      title: 'Editar perfil',
      name: 'Nombre',
      bio: 'Bio',
      namePlaceholder: 'Tu nombre',
      bioPlaceholder: 'Contale a la gente sobre vos…',
      location: 'Ubicación',
      locationPlaceholder: 'Buscar ciudad…',
      interests: 'Intereses',
      interestsPlaceholder: 'ej. senderismo, música, cocina',
      interestsHint: 'Separalos con comas',
      updated: '¡Perfil actualizado!',
      errName: 'El nombre es obligatorio.',
      errGender: 'Seleccioná tu género.',
      errSeeking: 'Seleccioná al menos un género que te interese.',
      errUpdate: 'No se pudo actualizar el perfil.',
      // account deletion
      deleteTitle: 'Eliminar cuenta',
      deleteHint: 'Esto borra tu perfil, fotos, matches y mensajes de forma permanente e irreversible.',
      deleteBtn: 'Eliminar mi cuenta',
      deleteConfirmTitle: '¿Eliminar tu cuenta definitivamente?',
      deleteConfirmMessage: 'Esta acción es permanente y no se puede deshacer. Escribí tu email para confirmar.',
      deletePlaceholder: 'Escribí tu email',
      deleteForever: 'Eliminar definitivamente',
      deleteErrEmail: 'El email no coincide. Escribí el email de tu cuenta para confirmar.',
      deleteErrFailed: 'No se pudo eliminar la cuenta. Intentá de nuevo.',
    },

    // ── Home / Discover ──
    home: {
      title: 'Descubrir',
      tagline: 'Conectá libremente',
      loading: 'Buscando gente cerca tuyo…',
      error: 'No se pudo conectar con el servidor.',
      retry: 'Reintentar',
      done: 'Eso es todo por ahora',
      doneSubtext: 'Ya viste a todos. Revisá tus matches y empezá a chatear.',
      editProfile: 'Editar perfil',
      resetSwipes: 'Reiniciar swipes',
      logout: 'Salir',
      resetConfirmTitle: 'Reiniciar swipes',
      resetConfirmMessage: 'Volverás a ver a las personas a las que les diste No like. ¿Estás seguro/a?',
      resetConfirmCancel: 'Cancelar',
      resetConfirmOk: 'Sí, reiniciar',
      empty: 'No quedan personas por ver por ahora. Volvé más tarde.',
    },

    // ── Donation ──
    donation: {
      menuEntry: 'Apoyar FreeMatch',
      title: 'Donar',
      heroTitle: 'Apoyá a FreeMatch',
      heroText: 'FreeMatch se mantiene gracias a personas como vos. Tu donación nos ayuda a cubrir los costos del servidor y seguir mejorando la app para todos.',
      amountLabel: 'Tu aporte',
      cta: 'Donar {{currency}}',
      ctaAmount: 'Donar {{amount}} {{currency}}',
      footnote: 'Serás redirigido/a a nuestra página segura de pago para completar tu aporte.',
      loadError: 'No se pudo cargar la información de donación.',
      unavailableTitle: 'Donaciones no disponibles',
      unavailableText: 'Por el momento la opción de donar no está disponible para tu cuenta. ¡Gracias por el interés!',
    },

    // ── Matches ──
    matches: {
      title: 'Matches',
      subtitle: '{{count}} conexiones',
      count_one: '{{count}} conexión',
      count_other: '{{count}} conexiones',
      empty: 'Todavía no tenés matches',
      emptySubtext: '¡Empezá a deslizar para conocer gente!',
      sayHello: 'Saludá 👋',
      newMatch: '¡Nuevo match!',
      sayHi: 'Saludá a {{name}}',
      startChat: 'Empezar a chatear',
      unmatchTitle: 'Eliminar match',
      unmatchMessage: '¿Eliminar a {{name}}? Esto borra la conversación para ambos.',
      unmatchConfirm: 'Eliminar',
      saySomething: 'Escribí un mensaje…',
      send: 'Enviar',
      typeMessage: 'Escribí un mensaje…',
    },

    // ── Photos ──
    photos: {
      title: 'Mis fotos',
      upload: 'Subir foto',
      loading: 'Cargando tus fotos…',
      noPhotos: 'Todavía no tenés fotos',
      noPhotosSubtext: 'Subí tu primera foto para empezar',
      requireLogin: 'Iniciá sesión para administrar tus fotos',
      addPhoto: 'Agregar foto',
      removePhotoConfirm: '¿Eliminar esta foto?',
      deleteTitle: 'Eliminar foto',
      deleteMessage: '¿Seguro que querés eliminar esta foto?',
      deleteConfirm: 'Eliminar',
      deleteCancel: 'Cancelar',
      errPick: 'No se pudo seleccionar la imagen.',
      successUpload: 'Foto subida correctamente.',
      errUpload: 'No se pudo subir la foto.',
      errDelete: 'No se pudo eliminar la foto.',
    },

    // ── Tabs ──
    tabs: {
      discover: 'Descubrir',
      matches: 'Matches',
      photos: 'Fotos',
    },
  },
};

const en = {
  translation: {
    // ── Common ──
    common: {
      cancel: 'Cancel',
      save: 'Save',
      back: '← Back',
      error: 'Error',
      success: 'Success',
      required: '*',
      optional: 'optional',
    },
    gender: {
      man: 'Man',
      woman: 'Woman',
      other: 'Other',
      iAm: 'I am',
      interestedIn: 'Interested in',
    },
    language: {
      label: 'Language',
      es: 'Spanish',
      en: 'English',
    },

    // ── Legal ──
    legal: {
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
    },

    // ── Welcome ──
    welcome: {
      title: 'FreeMatch',
      tagline: 'Find your spark',
      subtitle: 'Find your perfect match',
      createAccount: 'Create account',
      login: 'Log in',
      disclaimerPrefix: 'By continuing you accept our',
      disclaimerAnd: 'and our',
      disclaimerSuffix: '.',
    },

    // ── Create Account ──
    createAccount: {
      title: 'Create your profile',
      subtitle: "Let's get you set up",
      photos: 'Photos',
      addAtLeastOne: 'Add at least one photo. The first is your main photo.',
      addPhoto: 'Add photo',
      removePhoto: 'Remove photo',
      main: 'MAIN',
      name: 'Name',
      namePlaceholder: 'Your first name',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      password: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Re-enter your password',
      dateOfBirth: 'Date of Birth',
      dateOfBirthPlaceholder: 'YYYY-MM-DD',
      aboutYou: 'About you',
      aboutYouPlaceholder: 'Write a short bio…',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      logIn: 'Log in',
      permissionNeeded: 'Permission needed',
      permissionMessage: 'Please allow access to your photo library.',
      registrationFailed: 'Registration failed. Please try again.',
      errPhoto: 'Please add at least one photo.',
      errName: 'Name is required.',
      errEmail: 'Email is required.',
      errEmailFormat: 'Please enter a valid email address.',
      errPassword: 'Password is required.',
      errPasswordLength: 'Password must be at least 6 characters.',
      errPasswordMatch: 'Passwords do not match.',
      errBornDate: 'Date of birth is required.',
      errBornDateFormat: 'Date of birth must be in YYYY-MM-DD format.',
      errBornDateInvalid: 'Date of birth is not a valid date.',
      errUnder18: 'You must be at least 18 years old.',
      errAgeInvalid: 'Please enter a valid date of birth.',
      errGender: 'Please select your gender.',
      errSeeking: "Please select at least one gender you're interested in.",
      errEmailTaken: 'That email is already linked to an account.',
      // legal consent
      legalPrefix: 'I accept the',
      legalAnd: 'and the',
      legalSuffix: 'to create my account.',
      errLegal: 'You must accept the Privacy Policy and Terms of Service to create your account.',
    },

    // ── Login ──
    login: {
      title: 'Log in',
      welcomeBack: 'Welcome back',
      subtitle: 'Log in with your email',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      login: 'Log in',
      needAccount: "Don't have an account?",
      createOne: 'Create one',
      success: 'Logged in!',
      err: 'Could not log in. Check your credentials.',
      errEmail: 'Please enter your email address.',
      errPassword: 'Please enter your password.',
      errInvalid: 'Email or password is incorrect.',
      errNoAccount: 'No account found with that email.',
      errNetwork: 'Could not log in. Please check your connection and try again.',
    },

    // ── Edit Profile ──
    editProfile: {
      title: 'Edit Profile',
      name: 'Name',
      bio: 'Bio',
      namePlaceholder: 'Your name',
      bioPlaceholder: 'Tell people about yourself…',
      location: 'Location',
      locationPlaceholder: 'Search city…',
      interests: 'Interests',
      interestsPlaceholder: 'e.g. hiking, music, cooking',
      interestsHint: 'Separate with commas',
      updated: 'Profile updated!',
      errName: 'Name is required.',
      errGender: 'Please select your gender.',
      errSeeking: 'Please select at least one gender you are interested in.',
      errUpdate: 'Failed to update profile.',
      // account deletion
      deleteTitle: 'Delete Account',
      deleteHint: 'This permanently and irreversibly deletes your profile, photos, matches, and messages.',
      deleteBtn: 'Delete my account',
      deleteConfirmTitle: 'Delete your account for good?',
      deleteConfirmMessage: 'This action is permanent and cannot be undone. Type your email to confirm.',
      deletePlaceholder: 'Type your email',
      deleteForever: 'Delete permanently',
      deleteErrEmail: 'Email does not match. Type the email on your account to confirm.',
      deleteErrFailed: 'Could not delete your account. Please try again.',
    },

    // ── Home / Discover ──
    home: {
      title: 'Discover',
      tagline: 'Connect freely',
      loading: 'Finding people near you...',
      error: 'Could not connect to server.',
      retry: 'Retry',
      done: "That's all for now",
      doneSubtext: "You've seen everyone. Check your matches and start chatting.",
      editProfile: 'Edit profile',
      resetSwipes: 'Reset swipes',
      logout: 'Log out',
      resetConfirmTitle: 'Reset swipes',
      resetConfirmMessage: 'You will see the people you left-swiped again. Are you sure?',
      resetConfirmCancel: 'Cancel',
      resetConfirmOk: "Yes, reset",
      empty: 'No one left to see for now. Come back later.',
    },

    // ── Donation ──
    donation: {
      menuEntry: 'Support FreeMatch',
      title: 'Donate',
      heroTitle: 'Support FreeMatch',
      heroText: 'FreeMatch is kept running by people like you. Your donation helps us cover server costs and keep improving the app for everyone.',
      amountLabel: 'Your contribution',
      cta: 'Donate {{currency}}',
      ctaAmount: 'Donate {{amount}} {{currency}}',
      footnote: "You'll be redirected to our secure payment page to complete your contribution.",
      loadError: "Couldn't load donation info.",
      unavailableTitle: 'Donations unavailable',
      unavailableText: "Donating isn't available for your account right now. Thanks for the interest!",
    },

    // ── Matches ──
    matches: {
      title: 'Matches',
      subtitle: '{{count}} connections',
      count_one: '{{count}} connection',
      count_other: '{{count}} connections',
      empty: 'No matches yet',
      emptySubtext: 'Start swiping to meet people!',
      sayHello: 'Say hello 👋',
      newMatch: "It's a match!",
      sayHi: 'Say hi to {{name}}',
      startChat: 'Start chatting',
      unmatchTitle: 'Unmatch',
      unmatchMessage: 'Unmatch with {{name}}? This deletes your conversation for both of you.',
      unmatchConfirm: 'Unmatch',
      saySomething: 'Write a message…',
      send: 'Send',
      typeMessage: 'Type a message...',
    },

    // ── Photos ──
    photos: {
      title: 'My Photos',
      upload: 'Upload Photo',
      loading: 'Loading your photos...',
      noPhotos: 'No photos yet',
      noPhotosSubtext: 'Upload your first photo to get started',
      requireLogin: 'Please log in to manage photos',
      addPhoto: 'Add photo',
      removePhotoConfirm: 'Remove this photo?',
      deleteTitle: 'Delete Photo',
      deleteMessage: 'Are you sure you want to delete this photo?',
      deleteConfirm: 'Delete',
      deleteCancel: 'Cancel',
      errPick: 'Failed to pick image',
      successUpload: 'Photo uploaded successfully',
      errUpload: 'Failed to upload photo',
      errDelete: 'Failed to delete photo',
    },

    // ── Tabs ──
    tabs: {
      discover: 'Discover',
      matches: 'Matches',
      photos: 'Photos',
    },
  },
};

export function detectDefaultLanguage(): Language {
  return 'es';
}

export async function loadSavedLanguage(): Promise<Language> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // ignore storage errors
  }
  return detectDefaultLanguage();
}

export async function saveLanguage(lang: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore storage errors
  }
}

void i18n.use(initReactI18next).init({
  resources: { es, en },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPattern = (aliases: readonly string[]): RegExp =>
  new RegExp(aliases.map(escapeRegExp).join("|"), "i");

export const adminUiText = {
  hero: {
    title: "Центр управления фича-тогглами",
    subtitle: "Группы команд, тогглы и управляемая раскатка в одной системе."
  },
  tabs: {
    onboarding: "Обучение",
    groups: "Группы",
    toggles: "Фича-тогглы"
  },
  auth: {
    heading: "Вход администратора",
    emailLabel: "Почта",
    passwordLabel: "Пароль",
    loginButton: "Войти"
  },
  groups: {
    heading: "Группы команд",
    nameLabel: "Название группы",
    descriptionLabel: "Описание",
    createButton: "Создать группу"
  },
  toggles: {
    heading: "Feature toggles",
    createButton: "Create toggle"
  },
  toggleDrawer: {
    createHeading: "Create toggle",
    editHeading: "Edit toggle",
    closeButton: "Close"
  }
} as const;

export const adminUiAliases = {
  auth: {
    heading: [adminUiText.auth.heading, "Admin login"],
    emailLabel: [adminUiText.auth.emailLabel, "Email"],
    passwordLabel: [adminUiText.auth.passwordLabel, "Password"],
    loginButton: [adminUiText.auth.loginButton, "Sign in", "Login"]
  },
  tabs: {
    onboarding: [adminUiText.tabs.onboarding, "Onboarding"],
    groups: [adminUiText.tabs.groups, "Groups"],
    toggles: [adminUiText.tabs.toggles, adminUiText.toggles.heading, "Toggles"]
  },
  groups: {
    heading: [adminUiText.groups.heading, "Team groups", "Groups"],
    nameLabel: [adminUiText.groups.nameLabel, "Group name"],
    descriptionLabel: [adminUiText.groups.descriptionLabel, "Description"],
    createButton: [adminUiText.groups.createButton, "Create group"]
  },
  toggles: {
    heading: [adminUiText.toggles.heading, adminUiText.tabs.toggles],
    createButton: [adminUiText.toggles.createButton, "Создать тоггл"]
  },
  toggleDrawer: {
    heading: [adminUiText.toggleDrawer.createHeading, "Создание тоггла"],
    closeButton: [adminUiText.toggleDrawer.closeButton, "Закрыть"]
  }
} as const;

export const adminUiPatterns = {
  auth: {
    heading: buildPattern(adminUiAliases.auth.heading),
    emailLabel: buildPattern(adminUiAliases.auth.emailLabel),
    passwordLabel: buildPattern(adminUiAliases.auth.passwordLabel),
    loginButton: buildPattern(adminUiAliases.auth.loginButton)
  },
  tabs: {
    onboarding: buildPattern(adminUiAliases.tabs.onboarding),
    groups: buildPattern(adminUiAliases.tabs.groups),
    toggles: buildPattern(adminUiAliases.tabs.toggles)
  },
  groups: {
    heading: buildPattern(adminUiAliases.groups.heading),
    nameLabel: buildPattern(adminUiAliases.groups.nameLabel),
    descriptionLabel: buildPattern(adminUiAliases.groups.descriptionLabel),
    createButton: buildPattern(adminUiAliases.groups.createButton)
  },
  toggles: {
    heading: buildPattern(adminUiAliases.toggles.heading),
    createButton: buildPattern(adminUiAliases.toggles.createButton)
  },
  toggleDrawer: {
    heading: buildPattern(adminUiAliases.toggleDrawer.heading),
    closeButton: buildPattern(adminUiAliases.toggleDrawer.closeButton)
  }
} as const;

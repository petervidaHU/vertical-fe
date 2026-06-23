import { AppShell, Badge, Box, Burger, Group, NavLink, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet, useLocation } from "react-router";

const journeyWorkspacePattern = /^\/admin\/[^/]+(?:\/.*)?$/;

const workspaceLinks = [
  {
    label: "Overview",
    description: "Understand the admin space and jump into the right workflow.",
    to: "/admin",
    matches: (pathname: string) => pathname === "/admin",
  },
  {
    label: "Journeys",
    description: "Create journeys and enter a journey workspace for editing.",
    to: "/admin/journeys",
    matches: (pathname: string) => pathname.startsWith("/admin/journeys") || journeyWorkspacePattern.test(pathname),
  },
] as const;

function getActiveSection(pathname: string) {
  if (journeyWorkspacePattern.test(pathname)) {
    return {
      eyebrow: "Journey workspace",
      title: "Edit one journey in context",
      description: "Use the journey navigation to move between overview, altitude info, epics, stories, and tags without losing place.",
    };
  }

  if (pathname.startsWith("/admin/journeys")) {
    return {
      eyebrow: "Journeys",
      title: "Manage the source timelines",
      description: "Create, rename, and remove journeys before drilling into a specific journey workspace.",
    };
  }

  return {
    eyebrow: "Overview",
    title: "Timeline administration workspace",
    description: "A single place to manage journeys and then edit each journey's altitude info, epics, stories, and tags.",
  };
}

const AdminRoute = () => {
  const location = useLocation();
  const [mobileOpened, { toggle, close }] = useDisclosure(false);
  const activeSection = getActiveSection(location.pathname);

  return (
    <AppShell
      header={{ height: { base: 76, sm: 88 } }}
      navbar={{
        width: { base: "100%", sm: 300, lg: 340 },
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: false },
      }}
      padding={{ base: "md", sm: "lg", xl: "xl" }}
      withBorder={false}
      layout="alt"
      styles={{
        main: {
          background:
            "radial-gradient(circle at top left, rgba(196, 232, 221, 0.72), transparent 24%), linear-gradient(180deg, #f6fbf8 0%, #eef4f7 48%, #f8f7f2 100%)",
          minHeight: "100dvh",
        },
      }}
    >
      <AppShell.Header
        px={{ base: "md", sm: "xl" }}
        py="sm"
        withBorder={false}
        style={{
          background: "rgba(247, 251, 249, 0.88)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(123, 141, 151, 0.16)",
        }}
      >
        <Group justify="space-between" align="center" h="100%" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={mobileOpened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle admin navigation" />
            <Box>
              <Group gap="xs" align="center">
                <Text size="xs" tt="uppercase" fw={800} c="teal.8" style={{ letterSpacing: "0.12em" }}>
                  {activeSection.eyebrow}
                </Text>
                <Badge color="teal" variant="light" radius="xl">
                  Admin
                </Badge>
              </Group>
              <Title order={2} size="h3" mt={2}>
                {activeSection.title}
              </Title>
            </Box>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        withBorder={false}
        style={{
          background: "linear-gradient(180deg, rgba(9, 37, 43, 0.98) 0%, rgba(17, 49, 57, 0.96) 100%)",
          color: "white",
        }}
      >
        <AppShell.Section>
          <Text size="xs" tt="uppercase" fw={800} c="teal.2" style={{ letterSpacing: "0.1em" }} px="xs" pt="xs">
            Vertical admin
          </Text>
        </AppShell.Section>

        <AppShell.Section grow mt="md">
          <Stack gap="xs">
            {workspaceLinks.map((link) => (
              <NavLink
                key={link.to}
                component={Link}
                to={link.to}
                label={link.label}
                active={link.matches(location.pathname)}
                variant="filled"
                color="teal"
                autoContrast
                onClick={close}
                styles={{
                  root: {
                    borderRadius: 12,
                    background: link.matches(location.pathname)
                      ? "linear-gradient(135deg, rgba(194, 242, 221, 0.96) 0%, rgba(160, 230, 214, 0.92) 100%)"
                      : "rgba(255, 255, 255, 0.04)",
                    border: link.matches(location.pathname)
                      ? "1px solid rgba(194, 242, 221, 0.92)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                  },
                  label: {
                    fontWeight: 700,
                  },
                }}
              />
            ))}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1480} mx="auto" w="100%">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
};

export default AdminRoute;

import { Badge, Breadcrumbs, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

type AdminBreadcrumbItem = {
  label: string;
  to?: string;
};

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  actions?: React.ReactNode;
};

type AdminSectionProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

type AdminStatCardProps = {
  label: string;
  value: string | number;
  description?: string;
};

export function AdminPage({ children }: { children: React.ReactNode }) {
  return <Stack gap="xl">{children}</Stack>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  badge,
  breadcrumbs,
  actions,
}: AdminPageHeaderProps) {
  return (
    <Paper
      radius="24px"
      p={{ base: "lg", md: "xl" }}
      shadow="sm"
      style={{
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 251, 252, 0.92) 100%)",
        border: "1px solid rgba(111, 134, 145, 0.14)",
      }}
    >
      <Stack gap="md">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs separator="/" separatorMargin="sm">
            {breadcrumbs.map((item) => (
              item.to ? (
                <Text
                  key={`${item.label}:${item.to}`}
                  component={Link}
                  to={item.to}
                  size="sm"
                  c="teal.8"
                  td="none"
                >
                  {item.label}
                </Text>
              ) : (
                <Text key={item.label} size="sm" c="dimmed">
                  {item.label}
                </Text>
              )
            ))}
          </Breadcrumbs>
        ) : null}

        <Group justify="space-between" align="flex-start" gap="md">
          <Stack gap={6} maw={760}>
            <Group gap="xs">
              {eyebrow ? (
                <Text size="xs" tt="uppercase" fw={800} c="teal.8" style={{ letterSpacing: "0.12em" }}>
                  {eyebrow}
                </Text>
              ) : null}
              {badge ? (
                <Badge variant="light" color="teal" radius="xl">
                  {badge}
                </Badge>
              ) : null}
            </Group>
            <Title order={1} size="h2">
              {title}
            </Title>
            {description ? (
              <Text size="md" c="dimmed">
                {description}
              </Text>
            ) : null}
          </Stack>

          {actions ? <Group gap="sm">{actions}</Group> : null}
        </Group>
      </Stack>
    </Paper>
  );
}

export function AdminSection({ title, description, action, children }: AdminSectionProps) {
  return (
    <Paper
      radius="24px"
      p={{ base: "lg", md: "xl" }}
      shadow="sm"
      style={{
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(249, 251, 252, 0.94) 100%)",
        border: "1px solid rgba(111, 134, 145, 0.14)",
      }}
    >
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" gap="md">
          <Stack gap={4} maw={720}>
            <Title order={3} size="h4">
              {title}
            </Title>
            {description ? (
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            ) : null}
          </Stack>
          {action}
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, xl: 4 }} spacing="md" verticalSpacing="md">
      {children}
    </SimpleGrid>
  );
}

export function AdminStatCard({ label, value, description }: AdminStatCardProps) {
  return (
    <Paper
      radius="22px"
      p="lg"
      style={{
        background: "linear-gradient(135deg, rgba(12, 58, 69, 0.98) 0%, rgba(33, 91, 99, 0.95) 100%)",
        color: "white",
        border: "1px solid rgba(124, 208, 189, 0.16)",
        boxShadow: "0 18px 40px rgba(17, 43, 49, 0.16)",
      }}
    >
      <Stack gap={6}>
        <Text size="xs" tt="uppercase" fw={800} c="teal.1" style={{ letterSpacing: "0.12em" }}>
          {label}
        </Text>
        <Title order={2} c="white">
          {value}
        </Title>
        {description ? (
          <Text size="sm" c="rgba(231, 240, 242, 0.74)">
            {description}
          </Text>
        ) : null}
      </Stack>
    </Paper>
  );
}
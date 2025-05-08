import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Predefined Permissions
  const allPermissions = [
    {
      id: "manage_users",
      name: "Manage Users",
      description: "View, add, edit and delete users",
    },
    {
      id: "manage_posts",
      name: "Manage Posts",
      description: "Create, edit, publish and delete any posts",
    },
    {
      id: "manage_comments",
      name: "Manage Comments",
      description: "Moderate and delete any comments",
    },
    {
      id: "manage_settings",
      name: "Manage Settings",
      description: "Change site settings and configurations",
    },
    {
      id: "manage_roles",
      name: "Manage Roles",
      description: "Create and modify user roles and permissions",
    },
    {
      id: "create_posts",
      name: "Create Posts",
      description: "Create new posts",
    },
    {
      id: "edit_own_posts",
      name: "Edit Own Posts",
      description: "Edit own posts only",
    },
    {
      id: "read_posts",
      name: "Read Posts",
      description: "Access to read posts",
    },
    {
      id: "create_comments",
      name: "Create Comments",
      description: "Ability to comment on posts",
    },
  ];

  // Seed Permissions
  await prisma.permission.createMany({
    data: allPermissions,
    skipDuplicates: true,
  });

  // Roles to seed
  const roles = [
    {
      id: "admin",
      name: "Administrator",
      description: "Full access to all features and settings",
      permissions: [
        "manage_users",
        "manage_posts",
        "manage_comments",
        "manage_settings",
        "manage_roles",
      ],
    },
    {
      id: "editor",
      name: "Editor",
      description: "Can create, edit and publish content",
      permissions: ["manage_posts", "manage_comments"],
    },
    {
      id: "author",
      name: "Author",
      description: "Can create and edit their own content",
      permissions: ["create_posts", "edit_own_posts"],
    },
    {
      id: "subscriber",
      name: "Subscriber",
      description: "Can read content and leave comments",
      permissions: ["read_posts", "create_comments"],
    },
    {
      id: "user",
      name: "User",
      description: "Regular user who can comment and interact with the site",
      permissions: ["read_posts", "create_comments"],
    },
  ];

  // Create roles and assign permissions
  for (const role of roles) {
    // Create or update the role
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: {
        id: role.id,
        name: role.name,
        description: role.description,
      },
    });

    // Link role to its permissions
    for (const permissionId of role.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { id: permissionId },
      });

      if (!permission) {
        console.warn(`Permission ${permissionId} not found, skipping.`);
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          roleName: role.name,
          permissionId: permission.id,
          permissionName: permission.name,
        },
      });
    }

    console.log(`Seeded role: ${role.name}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Error seeding DB:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

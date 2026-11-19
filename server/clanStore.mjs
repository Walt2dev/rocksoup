import { randomUUID } from "node:crypto";

const ROLE_WEIGHT = Object.freeze({ leader: 3, officer: 2, member: 1 });
export const CONQUERED_REQUIRED = 3;
export const REFERRAL_REQUIRED = 1;

export class ClanError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = "ClanError";
    this.status = status;
  }
}

export function cleanName(value) {
  const name = String(value ?? "").trim().slice(0, 32);
  if (name.length < 2) {
    throw new ClanError("El nombre del clan debe tener al menos 2 caracteres.");
  }
  return name;
}

export function cleanTag(value) {
  const tag = String(value ?? "").trim().toUpperCase().slice(0, 4);
  if (!/^[A-Z0-9]{2,4}$/.test(tag)) {
    throw new ClanError("La etiqueta debe tener de 2 a 4 letras o números.");
  }
  return tag;
}

export function cleanDescription(value) {
  return String(value ?? "").trim().slice(0, 140);
}

export function canonicalPair(a, b) {
  return a <= b ? [a, b] : [b, a];
}

export function createClanStore({ db, logger = console } = {}) {
  function requireDb() {
    if (!db?.isAvailable()) {
      throw new ClanError("La base de datos no está disponible.", 503);
    }
  }

  async function membershipOf(userId) {
    requireDb();
    const rows = await db.query(
      "SELECT clan_id, role FROM clan_members WHERE user_id = ? LIMIT 1",
      [Number(userId)],
    );
    return rows[0] ?? null;
  }

  async function resolveUserId({ userId, email, username } = {}) {
    const id = Number(userId);
    if (Number.isInteger(id) && id > 0) {
      const rows = await db.query("SELECT id FROM users WHERE id = ? LIMIT 1", [id]);
      return rows[0] ? Number(rows[0].id) : null;
    }
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    if (cleanEmail) {
      const rows = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [
        cleanEmail,
      ]);
      return rows[0] ? Number(rows[0].id) : null;
    }
    const name = String(username ?? "").trim();
    if (name) {
      const rows = await db.query(
        "SELECT id FROM users WHERE display_name = ? ORDER BY id ASC LIMIT 1",
        [name],
      );
      return rows[0] ? Number(rows[0].id) : null;
    }
    return null;
  }

  async function listRequestsInternal(clanId) {
    const rows = await db.query(
      `SELECT r.user_id, r.created_at, u.display_name, u.avatar_url
       FROM clan_requests r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.clan_id = ?
       ORDER BY r.created_at ASC`,
      [String(clanId)],
    );
    return rows.map((row) => ({
      userId: Number(row.user_id),
      name: row.display_name ?? "Jugador",
      avatarUrl: row.avatar_url ?? null,
      createdAt: Number(row.created_at) || 0,
    }));
  }

  async function myClan(userId) {
    const membership = await membershipOf(userId);
    if (!membership) {
      return null;
    }
    const detail = await clanDetail(membership.clan_id, { forUserId: userId });
    detail.role = membership.role;
    detail.requests =
      ROLE_WEIGHT[membership.role] >= ROLE_WEIGHT.officer
        ? await listRequestsInternal(membership.clan_id)
        : [];
    return detail;
  }

  async function eligibility(userId) {
    requireDb();
    const membership = await membershipOf(userId);
    const villageRows = await db.query(
      "SELECT villages FROM rank_entries WHERE user_id = ? LIMIT 1",
      [Number(userId)],
    );
    const villages = Number(villageRows[0]?.villages) || 0;
    const pendingRows = await db.query(
      "SELECT clan_id FROM clan_requests WHERE user_id = ?",
      [Number(userId)],
    );
    return {
      inClan: Boolean(membership),
      clanId: membership?.clan_id ?? null,
      villages,
      required: CONQUERED_REQUIRED,
      canCreate: !membership && villages >= CONQUERED_REQUIRED,
      pendingRequests: pendingRows.map((row) => row.clan_id),
    };
  }

  async function clanDetail(clanId, { forUserId = null } = {}) {
    requireDb();
    const clanRows = await db.query(
      "SELECT * FROM clans WHERE id = ? LIMIT 1",
      [String(clanId)],
    );
    const clan = clanRows[0];
    if (!clan) {
      return null;
    }
    const memberRows = await db.query(
      `SELECT m.user_id, m.role, m.joined_at, u.display_name, u.avatar_url
       FROM clan_members m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.clan_id = ?
       ORDER BY FIELD(m.role, 'leader', 'officer', 'member'), m.joined_at ASC`,
      [String(clanId)],
    );
    const members = memberRows.map((row) => ({
      userId: Number(row.user_id),
      name: row.display_name ?? "Jugador",
      avatarUrl: row.avatar_url ?? null,
      role: row.role,
      joinedAt: Number(row.joined_at) || 0,
    }));
    const relations = await relationsFor(clanId);
    const invites = forUserId
      ? await db.query(
          "SELECT clan_id FROM clan_invites WHERE user_id = ?",
          [Number(forUserId)],
        )
      : [];
    return {
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      description: clan.description,
      leaderUserId: Number(clan.leader_user_id),
      createdAt: Number(clan.created_at) || 0,
      members,
      relations,
      invites: invites.map((row) => row.clan_id),
    };
  }

  async function relationsFor(clanId) {
    const rows = await db.query(
      `SELECT r.clan_a, r.clan_b, r.relation, r.requested_by, r.updated_at,
              ca.name AS name_a, ca.tag AS tag_a,
              cb.name AS name_b, cb.tag AS tag_b
       FROM clan_relations r
       LEFT JOIN clans ca ON ca.id = r.clan_a
       LEFT JOIN clans cb ON cb.id = r.clan_b
       WHERE r.clan_a = ? OR r.clan_b = ?
       ORDER BY r.updated_at DESC`,
      [String(clanId), String(clanId)],
    );
    return rows.map((row) => {
      const otherId = row.clan_a === String(clanId) ? row.clan_b : row.clan_a;
      return {
        otherClanId: otherId,
        otherName: row.clan_a === String(clanId) ? row.name_b : row.name_a,
        otherTag: row.clan_a === String(clanId) ? row.tag_b : row.tag_a,
        relation: row.relation,
        requestedBy: row.requested_by ?? null,
        updatedAt: Number(row.updated_at) || 0,
      };
    });
  }

  async function listClans() {
    requireDb();
    const rows = await db.query(
      `SELECT c.id, c.name, c.tag, c.description, c.leader_user_id, c.created_at,
              (SELECT COUNT(*) FROM clan_members m WHERE m.clan_id = c.id) AS members
       FROM clans c
       ORDER BY members DESC, c.name ASC`,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      tag: row.tag,
      description: row.description,
      leaderUserId: Number(row.leader_user_id),
      createdAt: Number(row.created_at) || 0,
      memberCount: Number(row.members) || 0,
    }));
  }

  async function createClan(userId, { name, tag, description } = {}) {
    requireDb();
    if (await membershipOf(userId)) {
      throw new ClanError("Ya perteneces a un clan.");
    }
    const villageRows = await db.query(
      "SELECT villages FROM rank_entries WHERE user_id = ? LIMIT 1",
      [Number(userId)],
    );
    const villages = Number(villageRows[0]?.villages) || 0;
    if (villages < CONQUERED_REQUIRED) {
      throw new ClanError(
        `Necesitas al menos ${CONQUERED_REQUIRED} aldeas conquistadas para crear un clan (tienes ${villages}).`,
        403,
      );
    }
    const clanName = cleanName(name);
    const clanTag = cleanTag(tag);
    const desc = cleanDescription(description);
    const id = randomUUID().replaceAll("-", "").slice(0, 12);
    const now = Date.now();
    try {
      await db.transaction(async (connection) => {
        await connection.execute(
          `INSERT INTO clans (id, name, tag, leader_user_id, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, clanName, clanTag, Number(userId), desc, now],
        );
        await connection.execute(
          `INSERT INTO clan_members (clan_id, user_id, role, joined_at)
           VALUES (?, ?, 'leader', ?)`,
          [id, Number(userId), now],
        );
      });
    } catch (error) {
      if (String(error.code).startsWith("ER_DUP")) {
        throw new ClanError("Ese nombre o etiqueta de clan ya existe.");
      }
      throw error;
    }
    return clanDetail(id);
  }

  async function invite(clanId, actorUserId, target = {}) {
    requireDb();
    const membership = await membershipOf(actorUserId);
    if (!membership || membership.clan_id !== String(clanId)) {
      throw new ClanError("No perteneces a ese clan.", 403);
    }
    if (ROLE_WEIGHT[membership.role] < ROLE_WEIGHT.officer) {
      throw new ClanError("Solo el líder u oficiales pueden invitar.", 403);
    }
    const targetUserId = await resolveUserId(target);
    if (!targetUserId) {
      throw new ClanError(
        "No hay una cuenta registrada con ese correo o nombre de usuario.",
        404,
      );
    }
    if (targetUserId === Number(actorUserId)) {
      throw new ClanError("No puedes invitarte a ti mismo.");
    }
    if (await membershipOf(targetUserId)) {
      throw new ClanError("Ese jugador ya está en un clan.");
    }
    await db.execute(
      `INSERT IGNORE INTO clan_invites (clan_id, user_id, invited_by, created_at)
       VALUES (?, ?, ?, ?)`,
      [String(clanId), targetUserId, Number(actorUserId), Date.now()],
    );
    return { userId: targetUserId };
  }

  async function requestJoin(userId, clanId) {
    requireDb();
    if (await membershipOf(userId)) {
      throw new ClanError("Ya perteneces a un clan.");
    }
    const clans = await db.query("SELECT id FROM clans WHERE id = ? LIMIT 1", [
      String(clanId),
    ]);
    if (clans.length === 0) {
      throw new ClanError("El clan no existe.", 404);
    }
    await db.execute(
      `INSERT IGNORE INTO clan_requests (clan_id, user_id, created_at)
       VALUES (?, ?, ?)`,
      [String(clanId), Number(userId), Date.now()],
    );
    return true;
  }

  async function listRequests(actorUserId) {
    requireDb();
    const membership = await membershipOf(actorUserId);
    if (!membership) {
      throw new ClanError("No perteneces a ningún clan.", 403);
    }
    if (ROLE_WEIGHT[membership.role] < ROLE_WEIGHT.officer) {
      throw new ClanError("Solo el líder u oficiales ven las solicitudes.", 403);
    }
    return listRequestsInternal(membership.clan_id);
  }

  async function acceptRequest(actorUserId, targetUserId) {
    requireDb();
    const membership = await membershipOf(actorUserId);
    if (!membership) {
      throw new ClanError("No perteneces a ningún clan.", 403);
    }
    if (ROLE_WEIGHT[membership.role] < ROLE_WEIGHT.officer) {
      throw new ClanError("Solo el líder u oficiales aceptan solicitudes.", 403);
    }
    const target = await membershipOf(targetUserId);
    if (target) {
      throw new ClanError("Ese jugador ya está en un clan.");
    }
    const rows = await db.query(
      "SELECT id FROM clan_requests WHERE clan_id = ? AND user_id = ? LIMIT 1",
      [membership.clan_id, Number(targetUserId)],
    );
    if (rows.length === 0) {
      throw new ClanError("No hay una solicitud de ese jugador.", 404);
    }
    await db.transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO clan_members (clan_id, user_id, role, joined_at)
         VALUES (?, ?, 'member', ?)`,
        [membership.clan_id, Number(targetUserId), Date.now()],
      );
      await connection.execute("DELETE FROM clan_requests WHERE user_id = ?", [
        Number(targetUserId),
      ]);
      await connection.execute("DELETE FROM clan_invites WHERE user_id = ?", [
        Number(targetUserId),
      ]);
    });
    return true;
  }

  async function declineRequest(actorUserId, targetUserId) {
    requireDb();
    const membership = await membershipOf(actorUserId);
    if (!membership) {
      throw new ClanError("No perteneces a ningún clan.", 403);
    }
    if (ROLE_WEIGHT[membership.role] < ROLE_WEIGHT.officer) {
      throw new ClanError("Solo el líder u oficiales rechazan solicitudes.", 403);
    }
    await db.execute(
      "DELETE FROM clan_requests WHERE clan_id = ? AND user_id = ?",
      [membership.clan_id, Number(targetUserId)],
    );
    return true;
  }

  async function acceptInvite(userId, clanId) {
    requireDb();
    if (await membershipOf(userId)) {
      throw new ClanError("Ya perteneces a un clan.");
    }
    const invites = await db.query(
      "SELECT * FROM clan_invites WHERE user_id = ? AND clan_id = ? LIMIT 1",
      [Number(userId), String(clanId)],
    );
    if (invites.length === 0) {
      throw new ClanError("No tienes una invitación de ese clan.", 404);
    }
    await db.transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO clan_members (clan_id, user_id, role, joined_at)
         VALUES (?, ?, 'member', ?)`,
        [String(clanId), Number(userId), Date.now()],
      );
      await connection.execute(
        "DELETE FROM clan_invites WHERE user_id = ?",
        [Number(userId)],
      );
    });
    return clanDetail(clanId);
  }

  async function declineInvite(userId, clanId) {
    requireDb();
    await db.execute(
      "DELETE FROM clan_invites WHERE user_id = ? AND clan_id = ?",
      [Number(userId), String(clanId)],
    );
    return true;
  }

  async function leaveClan(userId) {
    requireDb();
    const membership = await membershipOf(userId);
    if (!membership) {
      throw new ClanError("No perteneces a ningún clan.", 404);
    }
    const clanId = membership.clan_id;
    const memberRows = await db.query(
      "SELECT user_id, role FROM clan_members WHERE clan_id = ?",
      [clanId],
    );
    const isLeader = membership.role === "leader";
    const others = memberRows.filter((row) => Number(row.user_id) !== Number(userId));
    if (isLeader && others.length > 0) {
      throw new ClanError("Transfiere el liderazgo antes de salir del clan.");
    }
    await db.transaction(async (connection) => {
      await connection.execute(
        "DELETE FROM clan_members WHERE user_id = ?",
        [Number(userId)],
      );
      if (memberRows.length === 1) {
        await connection.execute("DELETE FROM clans WHERE id = ?", [clanId]);
        await connection.execute(
          "DELETE FROM clan_relations WHERE clan_a = ? OR clan_b = ?",
          [clanId, clanId],
        );
      }
    });
    return true;
  }

  async function kick(clanId, actorUserId, targetUserId) {
    requireDb();
    const membership = await membershipOf(actorUserId);
    if (!membership || membership.clan_id !== String(clanId)) {
      throw new ClanError("No perteneces a ese clan.", 403);
    }
    if (ROLE_WEIGHT[membership.role] < ROLE_WEIGHT.officer) {
      throw new ClanError("Solo el líder u oficiales pueden expulsar.", 403);
    }
    const target = await membershipOf(targetUserId);
    if (!target || target.clan_id !== String(clanId)) {
      throw new ClanError("Ese jugador no está en tu clan.", 404);
    }
    if (target.role === "leader") {
      throw new ClanError("No se puede expulsar al líder.");
    }
    await db.execute(
      "DELETE FROM clan_members WHERE user_id = ? AND clan_id = ?",
      [Number(targetUserId), String(clanId)],
    );
    return true;
  }

  async function setRelation(actorUserId, targetClanId, action) {
    requireDb();
    const membership = await membershipOf(actorUserId);
    if (!membership) {
      throw new ClanError("No perteneces a ningún clan.", 403);
    }
    if (ROLE_WEIGHT[membership.role] < ROLE_WEIGHT.officer) {
      throw new ClanError("Solo el líder u oficiales gestionan la diplomacia.", 403);
    }
    const actorClanId = membership.clan_id;
    if (actorClanId === String(targetClanId)) {
      throw new ClanError("No puedes relacionarte con tu propio clan.");
    }
    const targetRows = await db.query("SELECT id FROM clans WHERE id = ? LIMIT 1", [
      String(targetClanId),
    ]);
    if (targetRows.length === 0) {
      throw new ClanError("El clan destino no existe.", 404);
    }
    const [a, b] = canonicalPair(actorClanId, String(targetClanId));
    const now = Date.now();
    const existingRows = await db.query(
      "SELECT * FROM clan_relations WHERE clan_a = ? AND clan_b = ? LIMIT 1",
      [a, b],
    );
    const existing = existingRows[0];

    if (action === "ally_request") {
      if (existing?.relation === "ally") {
        throw new ClanError("Ya son aliados.");
      }
      await db.execute(
        `INSERT INTO clan_relations (clan_a, clan_b, relation, requested_by, updated_at)
         VALUES (?, ?, 'ally_request', ?, ?)
         ON DUPLICATE KEY UPDATE relation = 'ally_request', requested_by = ?, updated_at = ?`,
        [a, b, actorClanId, now, actorClanId, now],
      );
      return { relation: "ally_request" };
    }

    if (action === "ally_accept") {
      if (!existing || existing.relation !== "ally_request" || existing.requested_by === actorClanId) {
        throw new ClanError("No hay una solicitud de alianza que puedas aceptar.", 404);
      }
      await db.execute(
        "UPDATE clan_relations SET relation = 'ally', requested_by = NULL, updated_at = ? WHERE clan_a = ? AND clan_b = ?",
        [now, a, b],
      );
      return { relation: "ally" };
    }

    if (action === "enemy") {
      await db.execute(
        `INSERT INTO clan_relations (clan_a, clan_b, relation, requested_by, updated_at)
         VALUES (?, ?, 'enemy', NULL, ?)
         ON DUPLICATE KEY UPDATE relation = 'enemy', requested_by = NULL, updated_at = ?`,
        [a, b, now, now],
      );
      return { relation: "enemy" };
    }

    if (action === "neutral") {
      await db.execute(
        "UPDATE clan_relations SET relation = 'neutral', requested_by = NULL, updated_at = ? WHERE clan_a = ? AND clan_b = ?",
        [now, a, b],
      );
      return { relation: "neutral" };
    }

    throw new ClanError("Acción de diplomacia no válida.");
  }

  async function clanIdOf(userId) {
    const membership = await membershipOf(userId);
    return membership ? membership.clan_id : null;
  }

  return {
    listClans,
    clanDetail,
    myClan,
    clanIdOf,
    eligibility,
    createClan,
    invite,
    requestJoin,
    listRequests,
    acceptRequest,
    declineRequest,
    acceptInvite,
    declineInvite,
    leaveClan,
    kick,
    setRelation,
    relationsFor,
  };
}

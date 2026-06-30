-- =============================================================================
-- IMPRIMERIE BJC — Schéma Base de Données v2.0
-- Architecture : MySQL 8.0+ / MariaDB 10.6+
-- Généré à partir de l'analyse du prototype Excel + dump MySQL (22/06/2026)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `imprimerie_bjc_v2`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `imprimerie_bjc_v2`;

-- =============================================================================
-- 1. UTILISATEURS & SÉCURITÉ
-- Correction : mots de passe hashés (bcrypt/argon2 côté application)
-- =============================================================================

CREATE TABLE `utilisateurs` (
  `id`                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `nom_utilisateur`     VARCHAR(50)     NOT NULL,
  `mot_de_passe_hash`   VARCHAR(255)    NOT NULL COMMENT 'Hash bcrypt/argon2 — jamais en clair',
  `role`                ENUM('PDG','GESTIONNAIRE','COMPTABLE','CAISSIERE') NOT NULL DEFAULT 'CAISSIERE',
  `actif`               TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `derniere_connexion`  TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nom_utilisateur` (`nom_utilisateur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Comptes utilisateurs — mots de passe hashés côté API';

-- Seed utilisateurs (mots de passe à hasher avant insertion réelle)
INSERT INTO `utilisateurs` (`nom_utilisateur`, `mot_de_passe_hash`, `role`) VALUES
  ('Admin',     '$HASH_A_GENERER', 'PDG'),
  ('Christ',    '$HASH_A_GENERER', 'PDG'),
  ('Roland',    '$HASH_A_GENERER', 'COMPTABLE'),
  ('LOUISIANA', '$HASH_A_GENERER', 'CAISSIERE');

-- =============================================================================
-- 2. JOURNAL D'AUDIT (remplace SHT_LOGS)
-- =============================================================================

CREATE TABLE `audit_logs` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_utilisateur`  INT UNSIGNED    NULL COMMENT 'NULL si connexion échouée',
  `action`          VARCHAR(100)    NOT NULL COMMENT 'Ex: CONNEXION, DECONNEXION, CREATION_FACTURE',
  `entite`          VARCHAR(50)     NULL COMMENT 'Ex: ventes, clients, stock',
  `entite_id`       INT UNSIGNED    NULL,
  `details`         JSON            NULL COMMENT 'Snapshot avant/après pour les modifications',
  `ip_address`      VARCHAR(45)     NULL,
  `poste_travail`   VARCHAR(100)    NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_utilisateur` (`id_utilisateur`),
  KEY `idx_action_date` (`action`, `created_at`),
  CONSTRAINT `fk_audit_utilisateur`
    FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateurs` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. CLIENTS (normalisé — plus de doublons texte dans ventes)
-- =============================================================================

CREATE TABLE `clients` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `code_client`     VARCHAR(20)   NOT NULL COMMENT 'Ex: CLI-001',
  `nom_client`      VARCHAR(150)  NOT NULL,
  `telephone`       VARCHAR(30)   NULL,
  `adresse`         VARCHAR(255)  NULL,
  `email`           VARCHAR(150)  NULL,
  `rccm`            VARCHAR(50)   NULL COMMENT 'Registre Commerce',
  `niu`             VARCHAR(50)   NULL COMMENT 'Numéro Identifiant Unique fiscal',
  `rib`             VARCHAR(100)  NULL,
  `regime_fiscal`   ENUM('REEL','SIMPLIFIE','EXONERE') NULL DEFAULT 'REEL',
  `actif`           TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_code_client` (`code_client`),
  UNIQUE KEY `uq_nom_client` (`nom_client`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `clients` (`code_client`, `nom_client`, `telephone`, `adresse`, `rccm`, `niu`, `rib`) VALUES
  ('CLI-001', 'SAKURA', '069865360', 'SAKURA RESTAURANT', NULL, NULL, NULL),
  ('CLI-002', 'PAPA JO', NULL, NULL, NULL, NULL, NULL),
  ('CLI-003', 'AG PARTNERS', '06 689 36 36', '4 Bis rue Zandés Avenue Maya-maya, Poto-poto 2', NULL, NULL, NULL),
  ('CLI-004', 'TOTAL ENERGIES MARKETING CONGO', '0242 05 202 15 09', 'Rue de la corniche Brazzaville', NULL, NULL, NULL);

-- =============================================================================
-- 4. CATALOGUE SERVICES (liste de prix de vente)
-- Fusion de catalogue_services + données SHT_BD_BC
-- =============================================================================

CREATE TABLE `categories_services` (
  `id`    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom`   VARCHAR(100)     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nom_categorie` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories_services` (`nom`) VALUES
  ('Impression Offset'),
  ('Sérigraphie'),
  ('Infographie'),
  ('Finition'),
  ('Laboratoire'),
  ('Numérique'),
  ('Grand Format');

CREATE TABLE `catalogue_services` (
  `id`              INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `reference`       VARCHAR(30)       NOT NULL COMMENT 'Ex: IMP-A4-001',
  `designation`     VARCHAR(255)      NOT NULL,
  `id_categorie`    TINYINT UNSIGNED  NOT NULL,
  `format`          VARCHAR(50)       NULL COMMENT 'A4, A3, 1x1, recto-verso…',
  `prix_vente_ht`   DECIMAL(15,2)     NOT NULL DEFAULT 0.00,
  `unite`           VARCHAR(30)       NULL COMMENT 'm2, Unité, Exemplaire…',
  `actif`           TINYINT(1)        NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reference` (`reference`),
  KEY `idx_categorie` (`id_categorie`),
  CONSTRAINT `fk_catalogue_categorie`
    FOREIGN KEY (`id_categorie`) REFERENCES `categories_services` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='70 services du prototype conservés + extensible';

-- (Re-insertion des 70 lignes du catalogue original, avec id_categorie résolu)
INSERT INTO `catalogue_services` (`reference`, `designation`, `id_categorie`, `format`, `prix_vente_ht`, `unite`) VALUES
  ('OFF-BACHE-1x1',  'Impression sur bâche',                      1, '1x1',         4000.00, 'm2'),
  ('OFF-BACHE-2x2',  'Impression sur bâche',                      1, '2x2',        16000.00, 'm2'),
  ('OFF-BACHE-3x3',  'Impression sur bâche',                      1, '3x3',        36000.00, 'm2'),
  ('OFF-VIN-1x1',    'Impression sur vinyle',                     1, '1x1',         5000.00, 'm2'),
  ('OFF-VIN-2x1',    'Impression sur vinyle',                     1, '2x1',        10000.00, 'm2'),
  ('OFF-VIN-A3',     'Impression affiche sur vinyle',             1, 'A3',          1000.00, 'Unité'),
  ('OFF-VIN-A4',     'Impression affiche sur vinyle',             1, 'A4',           500.00, 'Unité'),
  ('OFF-VIN-A5',     'Impression affiche sur vinyle',             1, 'A5',           250.00, 'Unité'),
  ('OFF-VIN-A6',     'Impression affiche sur vinyle',             1, 'A6',           125.00, 'Unité'),
  ('OFF-VIN-A2',     'Impression affiche sur vinyle',             1, 'A2',          2000.00, 'Unité'),
  ('OFF-VIN-A1',     'Impression affiche sur vinyle',             1, 'A1',          4000.00, 'Unité'),
  ('OFF-MIC-1x1',    'Impression microperforé',                   1, '1x1',         7500.00, 'm2'),
  ('OFF-MIC-2x1',    'Impression microperforé',                   1, '2x1',        15000.00, 'm2'),
  ('OFF-AUT-A1',     'Impression affiche autocollant offset',     1, 'A1',          2000.00, 'Unité'),
  ('OFF-AUT-A2',     'Impression affiche autocollant offset',     1, 'A2',           800.00, 'Unité'),
  ('OFF-AUT-A3',     'Impression affiche autocollant offset',     1, 'A3',           400.00, 'Unité'),
  ('OFF-AUT-A4',     'Impression affiche autocollant offset',     1, 'A4',           200.00, 'Unité'),
  ('OFF-AUT-A5',     'Impression affiche autocollant offset',     1, 'A5',           100.00, 'Unité'),
  ('OFF-FLY-A4',     'Flyer Papier couché 150g',                  1, 'A4',           200.00, 'Unité'),
  ('OFF-FLY-A3',     'Flyer Papier couché 150g',                  1, 'A3',           800.00, 'Unité'),
  ('OFF-FLY-A5',     'Flyer Papier couché 150g',                  1, 'A5',           100.00, 'Unité'),
  ('LAB-BRI-A4',     'Papier bristol A4',                         5, 'A4',           250.00, 'Unité'),
  ('INF-AFF-A4',     'AFFICHE A4',                                3, 'A4',          7500.00, 'Exemplaire'),
  ('OFF-FLY-A6',     'Flyer papier couché 150g',                  1, 'A6',            50.00, 'Unité'),
  ('OFF-CV-RECTO',   'Carte de visite Papier couché 300g',        1, 'recto',        100.00, 'Unité'),
  ('OFF-CVP-R',      'Carte de visite plastifiée/pelliculée',     1, 'recto',        125.00, 'Unité'),
  ('OFF-CVP-RV',     'Carte de visite plastifiée/pelliculée',     1, 'recto-verso',  250.00, 'Unité'),
  ('OFF-BAD-R',      'Badge PVC sans lanière',                    1, 'recto',       5000.00, 'Unité'),
  ('OFF-BAD-RV',     'Badge PVC sans lanière',                    1, 'recto-verso', 10000.00, 'Unité'),
  ('OFF-BADL-RV',    'Badge PVC avec lanière',                    1, 'recto-verso', 14000.00, 'Unité'),
  ('OFF-BADL-R',     'Badge PVC avec lanière',                    1, 'recto',       7000.00, 'Unité'),
  ('OFF-ETI',        'Etiquette',                                 1, 'Au choix',     150.00, 'Unité'),
  ('INF-CONC',       'Conception simple',                         3, 'Au choix',    5000.00, 'Exemplaire'),
  ('INF-LOGO',       'Conception logo',                           3, 'Au choix',   10000.00, 'Exemplaire'),
  ('SER-TS-SUB',     'T-Shirt(Blanc) impression sublimation',     2, 'Sublimation', 3500.00, 'Unité'),
  ('SER-TS-DTF',     'T-Shirt(Blanc) impression DTF',             2, 'DTF',         5000.00, 'Unité'),
  ('SER-TSC-DTF',    'T-Shirt(couleurs) impression DTF',          2, 'DTF',         6000.00, 'Unité'),
  ('SER-PO-SUB',     'Polo(blanc) impression sublimation',        2, 'Sublimation', 5000.00, 'Unité'),
  ('SER-PO-DTF',     'Polo(blanc) impression DTF',                2, 'DTF',         6500.00, 'Unité'),
  ('SER-POC-DTF',    'Polo(couleurs) impression DTF',             2, 'DTF',         7000.00, 'Unité'),
  ('SER-GIL',        'Impression sur Gilet',                      2, 'Au choix',   10000.00, 'Unité'),
  ('SER-CHE',        'Impression sur chemise',                    2, NULL,         15000.00, 'Unité'),
  ('SER-CHO',        'Impression sur Choisible',                  2, NULL,          5000.00, 'Unité'),
  ('SER-CAS-SUB',    'Impression casquette blanche sublimation',  2, 'Sublimation', 1500.00, 'Unité'),
  ('SER-CAS-DTF',    'Impression casquette blanche DTF',          2, 'DTF',         2500.00, 'Unité'),
  ('SER-MUG-MAG',    'Impression sur tasse Mug magique',          2, 'Mug magique',  800.00, 'Unité'),
  ('SER-MUG-SIM',    'Impression sur tasse simple',               2, 'Simple',      4500.00, 'Unité'),
  ('SER-MUG-MAG2',   'Impression sur tasse Mug magique (grand)',  2, 'Mug magique', 8000.00, 'Unité'),
  ('SER-STY',        'Impression sur Stylo',                      2, NULL,          1500.00, 'Unité'),
  ('SER-USB',        'Clé USB avec impression 2GB',               2, '2GB',         7000.00, 'Unité'),
  ('OFF-CAL-1K-RV',  'Calendrier mural 1000G recto-verso',        1, 'recto-verso', 2500.00, 'Unité'),
  ('OFF-CAL-1K-R',   'Calendrier mural 1000G recto',              1, 'recto',       1500.00, 'Unité'),
  ('OFF-CAL-400-RV', 'Calendrier mural 400G recto-verso',         1, 'recto-verso', 1800.00, 'Unité'),
  ('OFF-CAL-BUR',    'Calendrier bureau',                         1, NULL,          2000.00, 'Unité'),
  ('FIN-COU',        'Coupe document',                            4, NULL,            50.00, 'Unité'),
  ('FIN-ROG-A1',     'Rognage A1',                                4, 'A1',          2000.00, 'Unité'),
  ('FIN-DOS',        'Dos-carré',                                 4, NULL,           150.00, 'Unité'),
  ('FIN-PEL-A3',     'Pelliculage A3 Recto',                      4, 'A3 Recto',    500.00, 'Unité'),
  ('FIN-PEL-A4',     'Pelliculage A4 Recto',                      4, 'A4 Recto',    250.00, 'Unité'),
  ('FIN-PEL-A2',     'Pelliculage A2 Recto',                      4, 'A2 Recto',   1000.00, 'Unité'),
  ('FIN-PLA-A3',     'Plastification A3',                         4, 'A3',         1000.00, 'Exemplaire'),
  ('FIN-PLA-A4',     'Plastification A4',                         4, 'A4',          500.00, 'Exemplaire'),
  ('OFF-CAR-50x3-A4','Carnet (50x3) A4',                          1, 'A4',         6000.00, 'Exemplaire'),
  ('OFF-CAR-50x4-A4','Carnet (50x4) A4',                          1, 'A4',         8000.00, 'Exemplaire'),
  ('OFF-CAR-50x3-A5','Carnet (50x3) A5',                          1, 'A5',         3500.00, 'Exemplaire'),
  ('OFF-CAR-50x2-A5','Carnet (50x2) A5',                          1, 'A5',         2000.00, 'Exemplaire'),
  ('OFF-CAR-50x3-A6','Carnet (50x3) A6',                          1, 'A6',         1500.00, 'Exemplaire'),
  ('OFF-CAR-50x2-A6','Carnet (50x2) A6',                          1, 'A6',         1000.00, 'Exemplaire'),
  ('LAB-BRI-A3',     'Papier bristol A3',                         5, 'A3',          500.00, 'Unité'),
  ('NUM-BAN-1x1',    'Banderole numérique 1m×1',                  6, '1m×1',       4000.00, 'm2');

-- Services additionnels identifiés dans SHT_BD_BC (non présents dans catalogue original)
INSERT INTO `catalogue_services` (`reference`, `designation`, `id_categorie`, `format`, `prix_vente_ht`, `unite`) VALUES
  ('GF-VIN-60x80',   'Impression affiche sur vinyle 60×80cm',   7, '60x80cm',    1920.00, 'Unité'),
  ('GF-VIN-80x120',  'Impression affiche sur vinyle 80×120cm',  7, '80x120cm',   3840.00, 'Unité'),
  ('GF-VIN-4x3P',    'Impression affiche sur vinyle 4×3m + pose',7,'4x3m',      55000.00, 'Unité'),
  ('OFF-LEA-3P',     'Leaflet à 3 plis couché 150g',            1, 'A4 recto-verso', 250.00, 'Unité'),
  ('OFF-CHE-A5',     'Chevalet quadri PVC 1-2mm',               1, 'A5 recto-verso', 6350.00, 'Unité'),
  ('GF-PAN-4x3',     'Location panneau 4m×3m',                  7, '4x3m',     150000.00, 'Unité'),
  ('INF-CREA',       'Forfait créa et adaptation de visuels',   3, NULL,         20000.00, 'Forfait');

-- =============================================================================
-- 5. STOCK — MATIÈRES PREMIÈRES & PRODUITS
-- =============================================================================

CREATE TABLE `produits` (
  `id`                        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `reference`                 VARCHAR(30)   NOT NULL,
  `designation`               VARCHAR(200)  NOT NULL,
  `categorie`                 ENUM('Grand Format','Serigraphie','Edition','Gadget','Consommable') NOT NULL,
  `est_matiere_premiere`      TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1=consommable, 0=produit fini/service',
  `unite_mesure`              ENUM('m2','unite','page','litre','kg','ml') NOT NULL DEFAULT 'unite',
  `conditionnement_achat`     ENUM('Unité','Rouleau','Carton') DEFAULT 'Unité',
  `nb_unites_par_carton`      INT           DEFAULT 1,
  `longueur_par_unite`        DECIMAL(10,2) DEFAULT 0.00 COMMENT 'En mètres, pour calcul surface',
  `largeur_par_unite`         DECIMAL(10,2) DEFAULT 0.00,
  `surface_totale_unitaire`   DECIMAL(10,2) GENERATED ALWAYS AS (`longueur_par_unite` * `largeur_par_unite`) STORED,
  `stock_actuel`              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stock_minimum_alerte`      DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Seuil déclenchant alerte',
  `prix_achat_moyen_pondere`  DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'PUMP recalculé à chaque entrée',
  `actif`                     TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reference_produit` (`reference`),
  KEY `idx_categorie_produit` (`categorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. MOUVEMENTS DE STOCK
-- =============================================================================

CREATE TABLE `stock_mouvements` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_produit`          INT UNSIGNED    NOT NULL,
  `type_mouvement`      ENUM('ENTREE','SORTIE_VENTE','SORTIE_PERTE','AJUSTEMENT') NOT NULL,
  `quantite`            DECIMAL(12,2)   NOT NULL COMMENT 'Toujours positif, le signe est dans type_mouvement',
  `prix_unitaire`       DECIMAL(12,2)   NULL COMMENT 'Prix achat pour ENTREE, prix vente pour SORTIE',
  `pump_avant`          DECIMAL(12,2)   NULL COMMENT 'PUMP avant ce mouvement',
  `pump_apres`          DECIMAL(12,2)   NULL COMMENT 'PUMP après recalcul',
  `reference_doc`       VARCHAR(50)     NULL COMMENT 'Réf. BC, facture fournisseur…',
  `id_utilisateur`      INT UNSIGNED    NULL,
  `notes`               TEXT            NULL,
  `created_at`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_produit_mvt` (`id_produit`),
  KEY `idx_date_mvt` (`created_at`),
  CONSTRAINT `fk_mvt_produit`
    FOREIGN KEY (`id_produit`) REFERENCES `produits` (`id`),
  CONSTRAINT `fk_mvt_utilisateur`
    FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. FICHES TECHNIQUES — liaison service → consommation matières
-- =============================================================================

CREATE TABLE `fiches_techniques` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `id_service`        INT UNSIGNED  NOT NULL COMMENT 'Référence catalogue_services',
  `id_produit_brut`   INT UNSIGNED  NOT NULL COMMENT 'Référence produits (matière)',
  `quantite_conso`    DECIMAL(15,4) NOT NULL COMMENT 'Quantité consommée par unité produite',
  `unite_conso`       VARCHAR(20)   NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ft_service` (`id_service`),
  KEY `idx_ft_produit` (`id_produit_brut`),
  CONSTRAINT `fk_ft_service`
    FOREIGN KEY (`id_service`) REFERENCES `catalogue_services` (`id`),
  CONSTRAINT `fk_ft_produit`
    FOREIGN KEY (`id_produit_brut`) REFERENCES `produits` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nomenclature : quelle matière consommée pour quel service';

-- =============================================================================
-- 8. ACHATS (journal des entrées stock — remplace SHT_JOURNAL_ACHATS)
-- =============================================================================

CREATE TABLE `achats_entetes` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `reference_doc`   VARCHAR(50)   NOT NULL COMMENT 'Réf. bon de commande fournisseur',
  `fournisseur`     VARCHAR(150)  NULL,
  `date_achat`      DATE          NOT NULL,
  `montant_total`   DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `id_utilisateur`  INT UNSIGNED  NULL,
  `notes`           TEXT          NULL,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ref_achat` (`reference_doc`),
  CONSTRAINT `fk_achat_user`
    FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `achats_details` (
  `id`                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `id_achat`              INT UNSIGNED  NOT NULL,
  `id_produit`            INT UNSIGNED  NOT NULL,
  `designation_libre`     VARCHAR(255)  NULL COMMENT 'Si produit non encore dans catalogue',
  `quantite`              DECIMAL(12,2) NOT NULL,
  `unite`                 VARCHAR(30)   NULL,
  `prix_achat_unitaire`   DECIMAL(12,2) NOT NULL,
  `montant_total_ligne`   DECIMAL(15,2) GENERATED ALWAYS AS (`quantite` * `prix_achat_unitaire`) STORED,
  PRIMARY KEY (`id`),
  KEY `idx_ad_achat` (`id_achat`),
  KEY `idx_ad_produit` (`id_produit`),
  CONSTRAINT `fk_ad_achat`
    FOREIGN KEY (`id_achat`) REFERENCES `achats_entetes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ad_produit`
    FOREIGN KEY (`id_produit`) REFERENCES `produits` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. BONS DE COMMANDE CLIENTS (SHT_BD_BC)
-- =============================================================================

CREATE TABLE `bons_commande` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `numero_bc`       VARCHAR(20)   NOT NULL COMMENT 'Ex: BJCBC-001',
  `id_client`       INT UNSIGNED  NOT NULL,
  `date_commande`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `statut`          ENUM('EN_ATTENTE','EN_COURS','LIVRE','FACTURE','ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
  `notes`           TEXT          NULL,
  `id_utilisateur`  INT UNSIGNED  NULL,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_numero_bc` (`numero_bc`),
  KEY `idx_bc_client` (`id_client`),
  CONSTRAINT `fk_bc_client`
    FOREIGN KEY (`id_client`) REFERENCES `clients` (`id`),
  CONSTRAINT `fk_bc_user`
    FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bons_commande_details` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `id_bc`             INT UNSIGNED  NOT NULL,
  `id_service`        INT UNSIGNED  NULL COMMENT 'Référence catalogue_services',
  `designation_libre` VARCHAR(255)  NULL COMMENT 'Si hors catalogue',
  `dimensions`        VARCHAR(50)   NULL COMMENT 'Ex: 60x80cm',
  `longueur`          DECIMAL(10,2) NULL,
  `largeur`           DECIMAL(10,2) NULL,
  `quantite`          DECIMAL(10,2) NOT NULL DEFAULT 1,
  `prix_unitaire_ht`  DECIMAL(12,2) NOT NULL,
  `total_ht_ligne`    DECIMAL(15,2) GENERATED ALWAYS AS (`quantite` * `prix_unitaire_ht`) STORED,
  PRIMARY KEY (`id`),
  KEY `idx_bcd_bc` (`id_bc`),
  CONSTRAINT `fk_bcd_bc`
    FOREIGN KEY (`id_bc`) REFERENCES `bons_commande` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bcd_service`
    FOREIGN KEY (`id_service`) REFERENCES `catalogue_services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed BC du prototype
INSERT INTO `bons_commande` (`numero_bc`, `id_client`, `date_commande`, `statut`) VALUES
  ('BJCBC-001', 1, '2026-06-20 16:04:47', 'FACTURE'),
  ('BJCBC-002', 2, '2026-06-22 12:37:59', 'FACTURE'),
  ('BJCBC-003', 3, '2026-06-22 14:10:13', 'FACTURE'),
  ('BJCBC-004', 4, '2026-06-22 14:29:50', 'EN_ATTENTE');

-- =============================================================================
-- 10. VENTES — FACTURES (SHT_JOURNAL_VENTES + SHT_FACTURE)
-- =============================================================================

CREATE TABLE `ventes` (
  `id`                      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `numero_facture`          VARCHAR(20)     NOT NULL COMMENT 'Ex: BJCFAC-001',
  `id_client`               INT UNSIGNED    NOT NULL,
  `id_bc`                   INT UNSIGNED    NULL COMMENT 'BC d origine si existant',
  `date_vente`              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `montant_brut_ht`         DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
  `remise_taux`             DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
  `remise_montant`          DECIMAL(15,2)   GENERATED ALWAYS AS (`montant_brut_ht` * `remise_taux` / 100) STORED,
  `montant_net_ht`          DECIMAL(15,2)   GENERATED ALWAYS AS (`montant_brut_ht` - (`montant_brut_ht` * `remise_taux` / 100)) STORED,
  `tva_active`              TINYINT(1)      NOT NULL DEFAULT 0,
  `tva_taux`                DECIMAL(5,2)    NOT NULL DEFAULT 18.00,
  `tva_montant`             DECIMAL(15,2)   NOT NULL DEFAULT 0.00 COMMENT 'Calculé côté application',
  `cad_active`              TINYINT(1)      NOT NULL DEFAULT 0,
  `cad_taux`                DECIMAL(5,2)    NOT NULL DEFAULT 5.00,
  `cad_montant`             DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
  `total_ttc`               DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
  `montant_paye`            DECIMAL(15,2)   NOT NULL DEFAULT 0.00 COMMENT 'Acompte ou paiement partiel reçu',
  `statut_paiement`         ENUM('NON_PAYE','PARTIEL','PAYE') NOT NULL DEFAULT 'NON_PAYE',
  `benefice_estime`         DECIMAL(15,2)   NULL COMMENT 'CA - coût matières estimé',
  `id_utilisateur`          INT UNSIGNED    NULL,
  `notes`                   TEXT            NULL,
  `created_at`              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_numero_facture` (`numero_facture`),
  KEY `idx_vente_client` (`id_client`),
  KEY `idx_vente_date` (`date_vente`),
  CONSTRAINT `fk_vente_client`
    FOREIGN KEY (`id_client`) REFERENCES `clients` (`id`),
  CONSTRAINT `fk_vente_bc`
    FOREIGN KEY (`id_bc`) REFERENCES `bons_commande` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_vente_user`
    FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ventes_details` (
  `id`                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `id_vente`              INT UNSIGNED  NOT NULL,
  `id_service`            INT UNSIGNED  NULL,
  `designation_libre`     VARCHAR(255)  NULL,
  `longueur`              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `largeur`               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantite`              DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `prix_vente_ht_applique` DECIMAL(12,2) NOT NULL,
  `total_ht_ligne`        DECIMAL(15,2) GENERATED ALWAYS AS (`quantite` * `prix_vente_ht_applique`) STORED,
  `cout_matiere_estime`   DECIMAL(12,2) NULL COMMENT 'PUMP × qté consommée (via fiche technique)',
  PRIMARY KEY (`id`),
  KEY `idx_vd_vente` (`id_vente`),
  CONSTRAINT `fk_vd_vente`
    FOREIGN KEY (`id_vente`) REFERENCES `ventes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vd_service`
    FOREIGN KEY (`id_service`) REFERENCES `catalogue_services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed ventes du prototype
INSERT INTO `ventes` (`numero_facture`, `id_client`, `date_vente`, `montant_brut_ht`, `total_ttc`, `statut_paiement`) VALUES
  ('BJCFAC-1', 1, '2026-06-20 12:22:22', 18000.00, 18000.00, 'NON_PAYE'),
  ('BJCFAC-2', 2, '2026-06-22 12:30:00', 100000.00, 100000.00, 'NON_PAYE'),
  ('BJCFAC-5', 3, '2026-06-22 14:59:22', 10000.00, 10000.00, 'NON_PAYE');

-- =============================================================================
-- 11. BONS DE LIVRAISON
-- =============================================================================

CREATE TABLE `bons_livraison` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `numero_bl`       VARCHAR(20)   NOT NULL COMMENT 'Ex: BJCRL-001',
  `id_vente`        INT UNSIGNED  NOT NULL,
  `date_livraison`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `statut`          ENUM('EN_PREPARATION','LIVRE','RETOURNE') NOT NULL DEFAULT 'EN_PREPARATION',
  `notes`           TEXT          NULL,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_numero_bl` (`numero_bl`),
  CONSTRAINT `fk_bl_vente`
    FOREIGN KEY (`id_vente`) REFERENCES `ventes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. CHARGES (SHT_CHARGES)
-- =============================================================================

CREATE TABLE `charges` (
  `id`              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `date_charge`     DATE            NOT NULL,
  `type_charge`     ENUM('FIXE','VARIABLE') NOT NULL DEFAULT 'FIXE',
  `categorie`       ENUM('LOYER','ELECTRICITE','EAU','SALAIRE','INTERNET','TRANSPORT','MAIN_OEUVRE','GAZ','PUBLICITE','MAINTENANCE','AUTRE') NOT NULL DEFAULT 'AUTRE',
  `designation`     VARCHAR(255)    NOT NULL,
  `montant`         DECIMAL(15,2)   NOT NULL,
  `mode_paiement`   ENUM('ESPECES','MOBILE_MONEY','VIREMENT','CHEQUE') NOT NULL DEFAULT 'ESPECES',
  `id_utilisateur`  INT UNSIGNED    NULL,
  `justificatif`    VARCHAR(255)    NULL COMMENT 'Chemin fichier scan du justificatif',
  `notes`           TEXT            NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_charge_date` (`date_charge`),
  KEY `idx_charge_type` (`type_charge`),
  CONSTRAINT `fk_charge_user`
    FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 13. NUMÉROTATION AUTOMATIQUE DES DOCUMENTS
-- Séquenceur centralisé pour factures, BL, BC
-- =============================================================================

CREATE TABLE `sequences_documents` (
  `type_doc`        VARCHAR(20)   NOT NULL COMMENT 'FACTURE, BC, BL',
  `annee`           SMALLINT      NOT NULL,
  `dernier_numero`  INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (`type_doc`, `annee`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sequences_documents` VALUES
  ('FACTURE', 2026, 5),
  ('BC',      2026, 4),
  ('BL',      2026, 5);

-- =============================================================================
-- 14. VUES ANALYTIQUES (remplace SHT_COMPTABILITE)
-- =============================================================================

CREATE OR REPLACE VIEW `v_ca_mensuel` AS
SELECT
  YEAR(v.date_vente)                          AS annee,
  MONTH(v.date_vente)                         AS mois,
  COUNT(v.id)                                 AS nb_factures,
  SUM(v.montant_net_ht)                       AS ca_ht,
  SUM(v.total_ttc)                            AS ca_ttc,
  SUM(IFNULL(v.benefice_estime, 0))           AS benefice_brut_estime
FROM `ventes` v
WHERE v.statut_paiement != 'NON_PAYE'  -- ou retirer ce filtre selon besoin
GROUP BY YEAR(v.date_vente), MONTH(v.date_vente)
ORDER BY annee DESC, mois DESC;

CREATE OR REPLACE VIEW `v_charges_mensuel` AS
SELECT
  YEAR(date_charge)   AS annee,
  MONTH(date_charge)  AS mois,
  type_charge,
  SUM(montant)        AS total_charges
FROM `charges`
GROUP BY YEAR(date_charge), MONTH(date_charge), type_charge;

CREATE OR REPLACE VIEW `v_situation_financiere` AS
SELECT
  ca.annee,
  ca.mois,
  ca.ca_ht,
  ca.ca_ttc,
  IFNULL(ch_fixe.total_charges, 0)      AS charges_fixes,
  IFNULL(ch_var.total_charges, 0)       AS charges_variables,
  ca.ca_ht
    - IFNULL(ch_fixe.total_charges, 0)
    - IFNULL(ch_var.total_charges, 0)   AS benefice_net_estime
FROM `v_ca_mensuel` ca
LEFT JOIN `v_charges_mensuel` ch_fixe
  ON ca.annee = ch_fixe.annee AND ca.mois = ch_fixe.mois AND ch_fixe.type_charge = 'FIXE'
LEFT JOIN `v_charges_mensuel` ch_var
  ON ca.annee = ch_var.annee AND ca.mois = ch_var.mois AND ch_var.type_charge = 'VARIABLE';

CREATE OR REPLACE VIEW `v_stock_alerte` AS
SELECT
  p.id,
  p.reference,
  p.designation,
  p.categorie,
  p.stock_actuel,
  p.stock_minimum_alerte,
  p.prix_achat_moyen_pondere,
  (p.stock_actuel * p.prix_achat_moyen_pondere) AS valeur_stock_ht,
  CASE WHEN p.stock_actuel <= p.stock_minimum_alerte THEN 'ALERTE' ELSE 'OK' END AS statut_stock
FROM `produits` p
WHERE p.actif = 1
ORDER BY statut_stock DESC, p.designation;

-- =============================================================================
-- 15. PROCÉDURE : Calcul automatique PUMP après entrée stock
-- =============================================================================

DELIMITER //

CREATE PROCEDURE `sp_entree_stock` (
  IN p_id_produit       INT UNSIGNED,
  IN p_quantite         DECIMAL(12,2),
  IN p_prix_achat       DECIMAL(12,2),
  IN p_reference_doc    VARCHAR(50),
  IN p_id_utilisateur   INT UNSIGNED
)
BEGIN
  DECLARE v_stock_actuel DECIMAL(12,2);
  DECLARE v_pump_actuel  DECIMAL(12,2);
  DECLARE v_nouveau_pump DECIMAL(12,2);
  DECLARE v_nouveau_stock DECIMAL(12,2);

  SELECT stock_actuel, prix_achat_moyen_pondere
  INTO v_stock_actuel, v_pump_actuel
  FROM produits WHERE id = p_id_produit FOR UPDATE;

  -- Formule PUMP : (stock × ancien_pump + qté × prix_achat) / (stock + qté)
  IF (v_stock_actuel + p_quantite) > 0 THEN
    SET v_nouveau_pump = (v_stock_actuel * v_pump_actuel + p_quantite * p_prix_achat)
                          / (v_stock_actuel + p_quantite);
  ELSE
    SET v_nouveau_pump = p_prix_achat;
  END IF;

  SET v_nouveau_stock = v_stock_actuel + p_quantite;

  UPDATE produits
  SET stock_actuel = v_nouveau_stock,
      prix_achat_moyen_pondere = v_nouveau_pump
  WHERE id = p_id_produit;

  INSERT INTO stock_mouvements
    (id_produit, type_mouvement, quantite, prix_unitaire, pump_avant, pump_apres, reference_doc, id_utilisateur)
  VALUES
    (p_id_produit, 'ENTREE', p_quantite, p_prix_achat, v_pump_actuel, v_nouveau_pump, p_reference_doc, p_id_utilisateur);
END //

DELIMITER ;

-- =============================================================================
-- FIN DU SCRIPT
-- =============================================================================
-- Tables créées : 16 tables + 3 vues + 1 procédure stockée
-- Données seed : catalogue (77 services), 4 clients, 4 utilisateurs, 3 ventes

-- ============================================================
-- MIGRATION v2 — à exécuter si vous avez déjà la v1
-- ============================================================
ALTER TABLE `ventes`
  ADD COLUMN IF NOT EXISTS `montant_paye` DECIMAL(15,2) NOT NULL DEFAULT 0.00
  AFTER `total_ttc`;

-- ============================================================
-- GESTION DE LA PAIE DU PERSONNEL
-- ============================================================

CREATE TABLE IF NOT EXISTS `personnel` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `nom`            VARCHAR(100)  NOT NULL,
  `prenom`         VARCHAR(100)  NULL,
  `poste`          VARCHAR(100)  NULL,
  `salaire_base`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `date_embauche`  DATE          NULL,
  `telephone`      VARCHAR(30)   NULL,
  `cnss`           VARCHAR(50)   NULL COMMENT 'Numero CNSS',
  `actif`          TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bulletins_paye` (
  `id`                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `id_personnel`        INT UNSIGNED  NOT NULL,
  `mois`                TINYINT       NOT NULL,
  `annee`               SMALLINT      NOT NULL,
  `salaire_base`        DECIMAL(12,2) NOT NULL,
  `jours_travailles`    DECIMAL(5,2)  NOT NULL DEFAULT 26,
  `heures_sup`          DECIMAL(12,2) NOT NULL DEFAULT 0,
  `primes`              DECIMAL(12,2) NOT NULL DEFAULT 0,
  `salaire_brut`        DECIMAL(12,2) NOT NULL,
  `cnss_salarial`       DECIMAL(12,2) NOT NULL DEFAULT 0,
  `irpp`                DECIMAL(12,2) NOT NULL DEFAULT 0,
  `retenues_autres`     DECIMAL(12,2) NOT NULL DEFAULT 0,
  `avance_sur_salaire`  DECIMAL(12,2) NOT NULL DEFAULT 0,
  `net_a_payer`         DECIMAL(12,2) NOT NULL,
  `statut`              ENUM('EN_ATTENTE','PAYE') NOT NULL DEFAULT 'EN_ATTENTE',
  `date_paiement`       DATETIME      NULL,
  `id_utilisateur`      INT UNSIGNED  NULL,
  `notes`               TEXT          NULL,
  `created_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bulletin` (`id_personnel`, `mois`, `annee`),
  KEY `idx_bp_periode` (`annee`, `mois`),
  CONSTRAINT `fk_bp_personnel` FOREIGN KEY (`id_personnel`) REFERENCES `personnel` (`id`),
  CONSTRAINT `fk_bp_user` FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

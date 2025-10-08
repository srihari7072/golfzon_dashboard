# -*- coding: utf-8 -*-
"""
Post-installation hooks for Golfzon Dashboard
Creates all database indexes for optimal query performance
"""
import logging
from odoo import api, SUPERUSER_ID

_logger = logging.getLogger(__name__)


def post_init_hook(env):
    """
    Post-installation hook to create all database indexes at once
    Executes after module installation completes
    
    In Odoo 18, the hook receives only 'env' parameter (not cr, registry)
    
    :param env: Odoo environment
    """
    cr = env.cr  # Get cursor from environment
    _logger.info("=" * 80)
    _logger.info("🚀 Starting Golfzon Dashboard Index Creation")
    _logger.info("=" * 80)
    
    total_indexes = 0
    
    try:
        # Create all indexes
        total_indexes += _create_visit_customer_indexes(cr)
        total_indexes += _create_payment_infos_indexes(cr)
        total_indexes += _create_person_indexes(cr)
        total_indexes += _create_time_table_indexes(cr)
        total_indexes += _create_booking_info_indexes(cr)
        total_indexes += _create_time_table_booking_indexes(cr)
        
        _logger.info("=" * 80)
        _logger.info(f"✅ Successfully created {total_indexes} database indexes!")
        _logger.info("=" * 80)
        
    except Exception as e:
        _logger.error("=" * 80)
        _logger.error(f"❌ Error creating indexes: {str(e)}")
        _logger.error("=" * 80)
        # Don't raise - allow module installation to complete


def _create_visit_customer_indexes(cr):
    """Create indexes for visit_customer table"""
    _logger.info("📊 Creating visit_customer indexes...")
    created = 0
    
    indexes = [
        # Index for date range queries (most important for performance)
        """
        CREATE INDEX IF NOT EXISTS visit_customer_visit_date_idx
        ON visit_customer(visit_date DESC)
        WHERE visit_date IS NOT NULL
        """,
        # Index for gender-based queries
        """
        CREATE INDEX IF NOT EXISTS visit_customer_gender_idx
        ON visit_customer(gender_scd)
        WHERE gender_scd IS NOT NULL
        """,
        # Composite index for date + gender queries (optimal for combined filtering)
        """
        CREATE INDEX IF NOT EXISTS visit_customer_date_gender_idx
        ON visit_customer(visit_date DESC, gender_scd)
        WHERE visit_date IS NOT NULL
        """,
    ]
    
    for idx, sql in enumerate(indexes, 1):
        try:
            cr.execute(sql)
            created += 1
            _logger.info(f"  ✓ Created visit_customer index {idx}/{len(indexes)}")
        except Exception as e:
            _logger.warning(f"  ⚠ Failed to create visit_customer index {idx}: {e}")
    
    return created


def _create_payment_infos_indexes(cr):
    """Create indexes for payment_infos table"""
    _logger.info("📊 Creating payment_infos indexes...")
    created = 0
    
    indexes = [
        # Composite index for faster queries on pay_date + cancel_yn
        """
        CREATE INDEX IF NOT EXISTS payment_infos_date_cancel_idx
        ON payment_infos(pay_date DESC, cancel_yn)
        WHERE cancel_yn = 'N' AND pay_date IS NOT NULL
        """,
        # Index for pay_date alone
        """
        CREATE INDEX IF NOT EXISTS payment_infos_pay_date_idx
        ON payment_infos(pay_date DESC)
        WHERE pay_date IS NOT NULL
        """,
    ]
    
    for idx, sql in enumerate(indexes, 1):
        try:
            cr.execute(sql)
            created += 1
            _logger.info(f"  ✓ Created payment_infos index {idx}/{len(indexes)}")
        except Exception as e:
            _logger.warning(f"  ⚠ Failed to create payment_infos index {idx}: {e}")
    
    return created


def _create_person_indexes(cr):
    """Create indexes for golfzon_person table"""
    _logger.info("📊 Creating golfzon_person indexes...")
    created = 0
    
    indexes = [
        # Index on birth_date for fast age calculations
        """
        CREATE INDEX IF NOT EXISTS golfzon_person_birth_date_idx
        ON golfzon_person(birth_date)
        WHERE birth_date IS NOT NULL AND birth_date != ''
        """,
    ]
    
    for idx, sql in enumerate(indexes, 1):
        try:
            cr.execute(sql)
            created += 1
            _logger.info(f"  ✓ Created golfzon_person index {idx}/{len(indexes)}")
        except Exception as e:
            _logger.warning(f"  ⚠ Failed to create golfzon_person index {idx}: {e}")
    
    return created


def _create_time_table_indexes(cr):
    """Create indexes for time_table table"""
    _logger.info("📊 Creating time_table indexes...")
    created = 0
    
    indexes = [
        # Index for time_table_id (primary lookup and joins)
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_id
        ON time_table(time_table_id)
        WHERE time_table_id IS NOT NULL
        """,
        # Index for bookg_date (most common filter - today's reservations)
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_bookg_date
        ON time_table(bookg_date DESC)
        WHERE bookg_date IS NOT NULL
        """,
        # Index for bookg_time (tee time queries)
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_bookg_time
        ON time_table(bookg_time)
        WHERE bookg_time IS NOT NULL
        """,
        # Composite index for date + time queries (reservation list)
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_date_time
        ON time_table(bookg_date DESC, bookg_time)
        WHERE bookg_date IS NOT NULL AND bookg_time IS NOT NULL
        """,
        # Composite index for date + time + id (full reservation lookup)
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_date_time_lookup
        ON time_table(bookg_date DESC, bookg_time, time_table_id)
        WHERE bookg_date IS NOT NULL AND bookg_time IS NOT NULL
        """,
        # Composite index for heatmap queries (date + time + id)
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_heatmap
        ON time_table(bookg_date DESC, bookg_time, time_table_id)
        WHERE bookg_date IS NOT NULL
        """,
        # Index for round_scd (used in reservation details)
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_round_scd
        ON time_table(round_scd)
        WHERE round_scd IS NOT NULL
        """,
        # Composite index for complete reservation query
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_full_reservation
        ON time_table(bookg_date DESC, bookg_time, time_table_id, round_scd)
        WHERE bookg_date IS NOT NULL AND bookg_time IS NOT NULL
        """,
        # Index for account filtering (if needed)
        """
        CREATE INDEX IF NOT EXISTS idx_time_table_account
        ON time_table(account_id)
        WHERE account_id IS NOT NULL
        """,
    ]
    
    for idx, sql in enumerate(indexes, 1):
        try:
            cr.execute(sql)
            created += 1
            _logger.info(f"  ✓ Created time_table index {idx}/{len(indexes)}")
        except Exception as e:
            _logger.warning(f"  ⚠ Failed to create time_table index {idx}: {e}")
    
    return created


def _create_booking_info_indexes(cr):
    """Create indexes for booking_info table"""
    _logger.info("📊 Creating booking_info indexes...")
    created = 0
    
    indexes = [
        # Index for bookg_info_id (primary lookup and joins)
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_id
        ON booking_info(bookg_info_id)
        WHERE bookg_info_id IS NOT NULL
        """,
        # Index for bookg_name (used in reservation list)
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_name
        ON booking_info(bookg_name)
        WHERE bookg_name IS NOT NULL
        """,
        # Composite index for reservation queries
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_lookup
        ON booking_info(bookg_info_id, bookg_name)
        WHERE bookg_info_id IS NOT NULL
        """,
        # Index for play_team_cnt aggregation (heatmap queries)
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_team_cnt
        ON booking_info(play_team_cnt)
        WHERE play_team_cnt > 0
        """,
        # Composite index for heatmap and reservation queries
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_full_lookup
        ON booking_info(bookg_info_id, bookg_name, play_team_cnt)
        WHERE bookg_info_id IS NOT NULL
        """,
        # Index for bookg_kind_scd (reservation type)
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_kind
        ON booking_info(bookg_kind_scd)
        WHERE bookg_kind_scd IS NOT NULL AND deleted_at IS NULL
        """,
        # Index for channel queries
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_channel
        ON booking_info(chnl_cd_id, chnl_detail)
        WHERE deleted_at IS NULL
        """,
        # Index for created_at (for time-based calculations)
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_created
        ON booking_info(created_at, bookg_state_scd)
        WHERE created_at IS NOT NULL AND deleted_at IS NULL
        """,
        # Composite index for member composition queries
        """
        CREATE INDEX IF NOT EXISTS idx_booking_info_composition
        ON booking_info(bookg_info_id, bookg_kind_scd, chnl_cd_id, bookg_state_scd, deleted_at)
        WHERE bookg_info_id IS NOT NULL
        """,
    ]
    
    for idx, sql in enumerate(indexes, 1):
        try:
            cr.execute(sql)
            created += 1
            _logger.info(f"  ✓ Created booking_info index {idx}/{len(indexes)}")
        except Exception as e:
            _logger.warning(f"  ⚠ Failed to create booking_info index {idx}: {e}")
    
    return created


def _create_time_table_booking_indexes(cr):
    """Create indexes for time_table_has_bookg_infos table (junction table)"""
    _logger.info("📊 Creating time_table_has_bookg_infos indexes...")
    created = 0
    
    indexes = [
        # Index for time_table_id (foreign key to time_table)
        """
        CREATE INDEX IF NOT EXISTS idx_junction_time_table_id
        ON time_table_has_bookg_infos(time_table_id)
        WHERE time_table_id IS NOT NULL
        """,
        # Index for bookg_info_id (foreign key to booking_info)
        """
        CREATE INDEX IF NOT EXISTS idx_junction_bookg_info_id
        ON time_table_has_bookg_infos(bookg_info_id)
        WHERE bookg_info_id IS NOT NULL
        """,
        # Composite index for joining both tables efficiently (most important!)
        """
        CREATE INDEX IF NOT EXISTS idx_junction_time_bookg
        ON time_table_has_bookg_infos(time_table_id, bookg_info_id)
        WHERE time_table_id IS NOT NULL AND bookg_info_id IS NOT NULL
        """,
        # Reverse composite index for different join orders
        """
        CREATE INDEX IF NOT EXISTS idx_junction_bookg_time
        ON time_table_has_bookg_infos(bookg_info_id, time_table_id)
        WHERE bookg_info_id IS NOT NULL AND time_table_id IS NOT NULL
        """,
        # Index on primary key (if exists)
        """
        CREATE INDEX IF NOT EXISTS idx_junction_primary_id
        ON time_table_has_bookg_infos(time_table_has_bookg_info_id)
        WHERE time_table_has_bookg_info_id IS NOT NULL
        """,
    ]
    
    for idx, sql in enumerate(indexes, 1):
        try:
            cr.execute(sql)
            created += 1
            _logger.info(f"  ✓ Created time_table_has_bookg_infos index {idx}/{len(indexes)}")
        except Exception as e:
            _logger.warning(f"  ⚠ Failed to create time_table_has_bookg_infos index {idx}: {e}")
    
    return created

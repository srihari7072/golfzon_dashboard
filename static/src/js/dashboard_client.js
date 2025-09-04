/** @odoo-module **/

import { Component, useRef, onMounted, useState, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

class GolfzonDashboard extends Component {
  static template = xml`
      <div class="o_golfzon_dashboard">
          <!-- Drawer Menu -->
          <div t-ref="menuDrawer" class="menu-drawer">
              <div class="drawer-header">
                  <img src="/golfzon_dashboard/static/src/img/golfzon-logo.png" alt="Golfzon Logo" class="drawer-logo"/>
                  <span class="drawer-title">GOLFZON</span>
              </div>
              <nav class="drawer-nav">
                  <a class="drawer-item" t-att-class="state.activeMenuItem === 'dashboard' ? 'active' : ''" href="#" t-on-click="() => this.setActiveMenuItem('dashboard')"><t t-esc="_t('Dashboard')"/></a>
                  <a class="drawer-item" t-att-class="state.activeMenuItem === 'member' ? 'active' : ''" href="#" t-on-click="() => this.setActiveMenuItem('member')"><t t-esc="_t('Member')"/></a>
                  <a class="drawer-item" t-att-class="state.activeMenuItem === 'membergroup' ? 'active' : ''" href="#" t-on-click="() => this.setActiveMenuItem('membergroup')"><t t-esc="_t('Member Group')"/></a>
                  <a class="drawer-item" t-att-class="state.activeMenuItem === 'crmcampaign' ? 'active' : ''" href="#" t-on-click="() => this.setActiveMenuItem('crmcampaign')"><t t-esc="_t('CRM Campaign')"/></a>
              </nav>
          </div>

          <!-- Main Content -->
          <div class="main-content">
              <header class="dashboard-header">
                  <div class="header-left">
                      <button class="menu-btn" t-on-click="toggleDrawer">
                          <span class="menu-icon">&#9776;</span>
                      </button>
                      <img src="/golfzon_dashboard/static/src/img/golfzon-logo.png" alt="Golfzon Logo" class="header-logo"/>
                  </div>
                  
                  <div class="header-right">
                      <div class="language-switcher">
                          <a href="#" t-att-class="state.currentLanguage === 'en_US' ? 'active' : ''" t-on-click="() => this.switchLanguage('en_US')" style="font-weight:bold;">ENG</a>
                          <span>|</span>
                          <a href="#" t-att-class="state.currentLanguage === 'ko_KR' ? 'active' : ''" t-on-click="() => this.switchLanguage('ko_KR')" style="font-weight:bold;">KOR</a>
                      </div>
                      <div class="user-info">
                          <span class="username" t-esc="state.userName"/>
                      </div>
                      <button class="logout-btn" t-on-click="logout" title="Logout">
                          <img src="/golfzon_dashboard/static/src/img/logout-button.svg" alt="Logout" class="logout-icon" />
                      </button>
                  </div>
              </header>

              <!-- Scrollable Content Container -->
              <div class="scrollable-content">
                  <!-- Golf Course Information Card -->
                  <div class="golf-info-card">
                      <div class="golf-info-main">
                          <!-- Date Section -->
                          <div class="info-section date-section">
                              <div class="info-content">
                                  <div class="info-value" t-esc="_t('Today:') + ' ' + state.currentDate"/>
                              </div>
                          </div>

                          <!-- Weather Section -->
                          <div class="info-section weather-section">
                              <div class="info-icon">
                                <img src="/golfzon_dashboard/static/src/img/weather-logo.svg" alt="Weather" class="weather-icon" />
                              </div>
                              <div class="info-content">
                                  <div class="info-label"><t t-esc="_t('WEATHER')"/></div>
                                  <div class="info-value">
                                      <t t-esc="_t('Temperature') + ' ' + state.weather.temperature"/>°C, 
                                      <t t-esc="_t('Chance of precipitation') + ' ' + state.weather.chance"/>%, 
                                      <t t-esc="_t('Precipitation') + ' ' + state.weather.precipitation"/>mm
                                  </div>
                              </div>
                          </div>

                          <!-- Total Reservations Section -->
                          <div class="info-section reservations-section">
                              <div class="info-icon">
                                <img src="/golfzon_dashboard/static/src/img/reservation-logo.svg" alt="Reservations" class="reservations-icon" />
                              </div>
                              <div class="info-content">
                                  <div class="info-label"><t t-esc="_t('TOTAL RESERVATIONS')"/></div>
                                  <div class="info-value">
                                      <t t-esc="state.reservations.current"/>/<t t-esc="state.reservations.total"/>
                                  </div>
                              </div>
                          </div>

                          <!-- Tee Time Bookings Section -->
                          <div class="info-section tee-time-section">
                              <div class="info-icon">
                                <img src="/golfzon_dashboard/static/src/img/tee-time-logo.svg" alt="Tee Time" class="tee-time-icon" />
                              </div>
                              <div class="info-content">
                                  <div class="info-label"><t t-esc="_t('FULL TEE TIME')"/></div>
                                  <div class="info-value">
                                      <t t-esc="_t('Part1')"/> <t t-esc="state.teeTime.part1.current"/>/<t t-esc="state.teeTime.part1.total"/>, 
                                      <t t-esc="_t('Part2')"/> <t t-esc="state.teeTime.part2.current"/>/<t t-esc="state.teeTime.part2.total"/>, 
                                      <t t-esc="_t('Part3')"/> <t t-esc="state.teeTime.part3.current"/>/<t t-esc="state.teeTime.part3.total"/>
                                  </div>
                              </div>
                          </div>

                          <!-- Dropdown Button -->
                          <div class="info-section dropdown-section">
                              <button class="weather-details-btn" t-on-click="toggleWeatherDetails">
                                  <span><t t-esc="_t('Weather &amp; Round Details')"/></span>
                                  <span class="dropdown-arrow" t-att-class="state.showWeatherDetails ? 'open' : ''">▼</span>
                              </button>
                          </div>
                      </div>
                      
                      <!-- Weather Details Dropdown -->
                      <div class="weather-details-panel" t-att-class="state.showWeatherDetails ? 'open' : ''">
                          <div class="side-by-side-container">
                              <!-- Left Half - Horizontal Weather -->
                              <div class="weather-half">
                                  <div class="horizontal-weather-container">
                                      <div class="horizontal-weather-scroll">
                                          <t t-foreach="state.hourlyWeather" t-as="hour" t-key="hour.time">
                                              <div class="weather-time-slot">
                                                  <div class="time-label" t-esc="hour.time"/>
                                                  <div class="weather-icon" t-esc="hour.icon"/>
                                                  <div class="temperature" t-esc="hour.temperature + '°C'"/>
                                                  <div class="precipitation-chance" t-esc="hour.chance + '%'"/>
                                                  <div class="precipitation-amount" t-esc="hour.precipitation + 'mm'"/>
                                              </div>
                                          </t>
                                      </div>
                                  </div>
                              </div>

                              <!-- Right Half - Tables -->
                              <div class="tables-half">
                                  <div class="combined-tables-container">
                                      <div class="combined-tables-scroll">
                                          <!-- First Table -->
                                          <div class="table-column">
                                              <div class="round-table-wrapper">
                                                  <table class="reservation-table">
                                                      <thead>
                                                          <tr>
                                                              <th><t t-esc="_t('Reservation Person')"/></th>
                                                              <th><t t-esc="_t('ID')"/></th>
                                                              <th><t t-esc="_t('Reservation Date')"/></th>
                                                              <th><t t-esc="_t('Tee Time')"/></th>
                                                              <th><t t-esc="_t('Rounds')"/></th>
                                                          </tr>
                                                      </thead>
                                                      <tbody>
                                                          <t t-foreach="state.reservationDetails.slice(0, 40)" t-as="reservation" t-key="reservation.id">
                                                              <tr>
                                                                  <td t-esc="reservation.person"/>
                                                                  <td t-esc="reservation.id"/>
                                                                  <td t-esc="reservation.date"/>
                                                                  <td t-esc="reservation.teeTime"/>
                                                                  <td t-esc="reservation.rounds"/>
                                                              </tr>
                                                          </t>
                                                      </tbody>
                                                  </table>
                                              </div>
                                          </div>

                                          <!-- Second Table -->
                                          <div class="table-column">
                                              <div class="round-table-wrapper">
                                                  <table class="reservation-table">
                                                      <thead>
                                                          <tr>
                                                              <th><t t-esc="_t('Reservation Person')"/></th>
                                                              <th><t t-esc="_t('ID')"/></th>
                                                              <th><t t-esc="_t('Reservation Date')"/></th>
                                                              <th><t t-esc="_t('Tee Time')"/></th>
                                                              <th><t t-esc="_t('Rounds')"/></th>
                                                          </tr>
                                                      </thead>
                                                      <tbody>
                                                          <t t-foreach="state.reservationDetails.slice(40, 80)" t-as="reservation" t-key="reservation.id">
                                                              <tr>
                                                                  <td t-esc="reservation.person"/>
                                                                  <td t-esc="reservation.id"/>
                                                                  <td t-esc="reservation.date"/>
                                                                  <td t-esc="reservation.teeTime"/>
                                                                  <td t-esc="reservation.rounds"/>
                                                              </tr>
                                                          </t>
                                                      </tbody>
                                                  </table>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Enhanced Performance Indicators Section -->
                  <div class="performance-indicators-section">
                      <h2 class="main-section-title" t-esc="state.performanceData.main_title"/>
                      
                      <div class="performance-cards-container">
                          <!-- Sales Performance Card -->
                          <div class="performance-card sales-card">
                              <div class="card-header">
                                  <h3 class="card-title" t-esc="state.performanceData.sales_performance.title"/>
                              </div>
                              <div class="card-content">
                                  <div class="metrics-row">
                                      <div class="metric-column">
                                          <div class="metric-label" t-esc="state.performanceData.sales_performance.current_label"/>
                                          <div class="metric-value" t-esc="state.performanceData.sales_performance.current_revenue"/>
                                          <div class="trend-wrapper">
                                              <div class="trend-indicator trend-up">
                                                  <span class="trend-icon">▲</span>
                                                  <span t-esc="state.performanceData.sales_performance.current_trend"/>
                                              </div>
                                              <div class="trend-period" t-esc="state.performanceData.sales_performance.trend_period"/>
                                          </div>
                                      </div>
                                      <div class="metric-column">
                                          <div class="metric-label" t-esc="state.performanceData.sales_performance.monthly_label"/>
                                          <div class="metric-value" t-esc="state.performanceData.sales_performance.monthly_revenue"/>
                                          <div class="trend-wrapper">
                                              <div class="trend-indicator trend-up">
                                                  <span class="trend-icon">▲</span>
                                                  <span t-esc="state.performanceData.sales_performance.monthly_trend"/>
                                              </div>
                                              <div class="trend-period" t-esc="state.performanceData.sales_performance.trend_period"/>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <!-- Average Order Value Card -->
                          <div class="performance-card order-value-card">
                              <div class="card-header">
                                  <h3 class="card-title" t-esc="state.performanceData.avg_order_value.title"/>
                              </div>
                              <div class="card-content">
                                  <div class="metrics-row">
                                      <div class="metric-column">
                                          <div class="metric-label" t-esc="state.performanceData.avg_order_value.current_label"/>
                                          <div class="metric-value" t-esc="state.performanceData.avg_order_value.current_weekly_value"/>
                                          <div class="trend-wrapper">
                                              <div class="trend-indicator trend-up">
                                                  <span class="trend-icon">▲</span>
                                                  <span t-esc="state.performanceData.avg_order_value.current_trend"/>
                                              </div>
                                              <div class="trend-period" t-esc="state.performanceData.avg_order_value.trend_period"/>
                                          </div>
                                      </div>
                                      <div class="metric-column">
                                          <div class="metric-label" t-esc="state.performanceData.avg_order_value.monthly_label"/>
                                          <div class="metric-value" t-esc="state.performanceData.avg_order_value.monthly_value"/>
                                          <div class="trend-wrapper">
                                              <div class="trend-indicator trend-up">
                                                  <span class="trend-icon">▲</span>
                                                  <span t-esc="state.performanceData.avg_order_value.monthly_trend"/>
                                              </div>
                                              <div class="trend-period" t-esc="state.performanceData.avg_order_value.trend_period"/>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <!-- Utilization Rate Card -->
                          <div class="performance-card utilization-card">
                              <div class="card-header">
                                  <h3 class="card-title" t-esc="state.performanceData.utilization_rate.title"/>
                              </div>
                              <div class="card-content">
                                  <div class="metrics-row">
                                      <div class="metric-column">
                                          <div class="metric-label" t-esc="state.performanceData.utilization_rate.current_label"/>
                                          <div class="metric-value" t-esc="state.performanceData.utilization_rate.current_weekly_capacity"/>
                                          <div class="trend-wrapper">
                                              <div class="trend-indicator trend-down">
                                                  <span class="trend-icon">▼</span>
                                                  <span t-esc="state.performanceData.utilization_rate.current_trend"/>
                                              </div>
                                              <div class="trend-period" t-esc="state.performanceData.utilization_rate.trend_period"/>
                                          </div>
                                      </div>
                                      <div class="metric-column">
                                          <div class="metric-label" t-esc="state.performanceData.utilization_rate.monthly_label"/>
                                          <div class="metric-value" t-esc="state.performanceData.utilization_rate.monthly_capacity"/>
                                          <div class="trend-wrapper">
                                              <div class="trend-indicator trend-up">
                                                  <span class="trend-icon">▲</span>
                                                  <span t-esc="state.performanceData.utilization_rate.monthly_trend"/>
                                              </div>
                                              <div class="trend-period" t-esc="state.performanceData.utilization_rate.trend_period"/>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Reservation Forecast Section - Updated Layout -->
                  <div class="reservation-forecast-section">
                      <div class="section-header">
                          <h2 class="main-section-title"><t t-esc="_t('Reservation Status')"/></h2>
                          <div class="analysis-period-info">
                              <span t-esc="state.forecastData.analysis_period"/>
                          </div>
                      </div>
                      
                      <div class="forecast-main-layout">
                          <!-- Left Side - Line Graph -->
                          <div class="forecast-left-side">
                              <div class="line-chart-card">
                                  <div class="chart-header">
                                      <div class="chart-title-section">
                                          <div class="title-with-tooltip">
                                              <h3><t t-esc="_t('Reservation Trend by Period')"/></h3>
                                              <div class="tooltip-wrapper">
                                                  <span class="help-icon">?</span>
                                                  <div class="tooltip-content"><t t-esc="_t('30 days after the inquiry date')"/></div>
                                              </div>
                                          </div>
                                          <div class="chart-meta">
                                              <span class="period-text"><t t-esc="state.last30DaysLabel"/></span>
                                          </div>
                                      </div>
                                      <div class="time-period-buttons">
                                          <button class="period-btn" t-att-class="state.selectedPeriod === '7days' ? 'active' : ''" t-on-click="() => this.setPeriod('7days')"><t t-esc="_t('Last 7 Days')"/></button>
                                          <button class="period-btn" t-att-class="state.selectedPeriod === '30days' ? 'active' : ''" t-on-click="() => this.setPeriod('30days')"><t t-esc="_t('Last 30 Days')"/></button>
                                      </div>
                                  </div>
                                  
                                  <div class="line-chart-container">
                                      <canvas t-ref="reservationTrendChart"></canvas>
                                  </div>
                                  
                                  <!-- Stats Cards below chart -->
                                  <div class="stats-cards-below">
                                      <div class="stat-card horizontal">
                                          <div class="stat-info">
                                              <span class="stat-label"><t t-esc="_t('Total number of reservations')"/></span>
                                              <div class="stat-value">2,926</div>
                                          </div>
                                          <div class="stat-comparison">
                                              <span class="comparison-label"><t t-esc="_t('compared to same period last year')"/></span>
                                              <div class="comparison-value increase">
                                                <span class="trend-icon">▲</span>
                                                <span>10%</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div class="stat-card horizontal">
                                          <div class="stat-info">
                                              <span class="stat-label"><t t-esc="_t('Total Operation rate')"/></span>
                                              <div class="stat-value">78.5%</div>
                                          </div>
                                          <div class="stat-breakdown horizontal-parts">
                                              <span><t t-esc="_t('Part 1')"/> 82.4%</span>
                                              <span><t t-esc="_t('Part 2')"/> 76.2%</span>
                                              <span><t t-esc="_t('Part 3')"/> 75.3%</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          <!-- Right Side - Heatmap and Pie Charts -->
                          <div class="forecast-right-side">
                              <!-- Top Half - Heatmap -->
                              <div class="heatmap-card">
                                  <div class="heatmap-main-container">
                                      <div class="heatmap-content">
                                          <div class="heatmap-header">
                                              <h3><t t-esc="_t('Reservation Trends')"/></h3>
                                          </div>
                                          <div class="heatmap-container">
                                              <!-- Heatmap Section with Error Handling -->
                                              <div class="heatmap-section">
                                                  <t t-try="heatmapContent">
                                                      <table class="heatmap-table" t-if="state.heatmapData and state.heatmapData.headers">
                                                          <thead>
                                                              <tr>
                                                                  <th></th>
                                                                  <t t-foreach="state.heatmapData.headers" t-as="header" t-key="header">
                                                                      <th t-esc="header"/>
                                                                  </t>
                                                              </tr>
                                                          </thead>
                                                          <tbody>
                                                              <t t-foreach="state.heatmapData.rows" t-as="row" t-key="row_index">
                                                                  <tr>
                                                                      <td class="row-label" t-esc="row.label"/>
                                                                      <t t-foreach="row.data" t-as="value" t-key="value_index">
                                                                          <td class="heatmap-cell" 
                                                                              t-att-data-value="value"
                                                                              t-att-class="this.getHeatmapCellClass(value)"
                                                                              t-on-click="(ev) => this.showReservationDetails(row.label, value_index, value, ev)">
                                                                              <span t-esc="value"/>
                                                                          </td>
                                                                      </t>
                                                                  </tr>
                                                              </t>
                                                          </tbody>
                                                      </table>
                                                      <div t-else="" class="heatmap-loading">
                                                          <span><t t-esc="_t('Loading heatmap data...')"/></span>
                                                      </div>
                                                      
                                                      <!-- Heatmap Legend -->
                                                      <div class="heatmap-legend">
                                                          <div class="legend-item"><div class="legend-color top-20"></div><span><t t-esc="_t('Top 20%')"/></span></div>
                                                          <div class="legend-item"><div class="legend-color top-20-40"></div><span><t t-esc="_t('Top 20-40%')"/></span></div>
                                                          <div class="legend-item"><div class="legend-color median-20"></div><span><t t-esc="_t('Median 20%')"/></span></div>
                                                          <div class="legend-item"><div class="legend-color bottom-20-40"></div><span><t t-esc="_t('Bottom 20-40%')"/></span></div>
                                                          <div class="legend-item"><div class="legend-color bottom-20"></div><span><t t-esc="_t('Bottom 20%')"/></span></div>
                                                      </div>
                                                  </t>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              
                              <!-- Bottom Half - Pie Charts -->
                              <div class="pie-charts-card">
                                  <div class="pie-charts-header">
                                      <h3><t t-esc="_t('Reservation member composition status')"/></h3>
                                  </div>
                                  
                                  <div class="pie-charts-grid">
                                      <!-- Member Type Chart -->
                                      <div class="pie-chart-grid-item">
                                          <div class="pie-chart-wrapper">
                                              <canvas t-ref="memberTypeChart"></canvas>
                                              <div class="chart-center-title"><t t-esc="_t('Reservation Proportion by Type')"/></div>
                                          </div>
                                          <div class="chart-content">
                                              <div class="chart-legend">
                                                  <div class="legend-entry">
                                                      <span class="dot individual"></span>
                                                      <span><t t-esc="_t('Individual')"/></span>
                                                      <span class="legend-value">76%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot joint"></span>
                                                      <span><t t-esc="_t('Joint Organization')"/></span>
                                                      <span class="legend-value">13%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot general"></span>
                                                      <span><t t-esc="_t('General Organization')"/></span>
                                                      <span class="legend-value">2%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot temporary"></span>
                                                      <span><t t-esc="_t('Temporary Organization')"/></span>
                                                      <span class="legend-value">8%</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <!-- Advance Booking Chart -->
                                      <div class="pie-chart-grid-item">
                                          <div class="pie-chart-wrapper">
                                              <canvas t-ref="advanceBookingChart"></canvas>
                                              <div class="chart-center-title"><t t-esc="_t('Reservation Proportion by Time')"/></div>
                                          </div>
                                          <div class="chart-content">
                                              <div class="chart-legend">
                                                  <div class="legend-entry">
                                                      <span class="dot d15"></span>
                                                      <span>D-15+</span>
                                                      <span class="legend-value">43%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot d14"></span>
                                                      <span>D-14</span>
                                                      <span class="legend-value">17%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot d7"></span>
                                                      <span>D-7</span>
                                                      <span class="legend-value">26%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot d3"></span>
                                                      <span>D-3</span>
                                                      <span class="legend-value">7%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot d1"></span>
                                                      <span>D-1</span>
                                                      <span class="legend-value">6%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot d0"></span>
                                                      <span>D-0</span>
                                                      <span class="legend-value">1%</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <!-- Regional Distribution Chart -->
                                      <div class="pie-chart-grid-item">
                                          <div class="pie-chart-wrapper">
                                              <canvas t-ref="regionalChart"></canvas>
                                              <div class="chart-center-title"><t t-esc="_t('Reservation Proportion by Channel')"/></div>
                                          </div>
                                          <div class="chart-content">
                                              <div class="chart-legend">
                                                  <div class="legend-entry">
                                                      <span class="dot phone"></span>
                                                      <span><t t-esc="_t('Phone')"/></span>
                                                      <span class="legend-value">48%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot internet"></span>
                                                      <span><t t-esc="_t('Internet')"/></span>
                                                      <span class="legend-value">19%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot agency1"></span>
                                                      <span><t t-esc="_t('Agency')"/></span>
                                                      <span class="legend-value">8%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot agency2"></span>
                                                      <span><t t-esc="_t('Agency')"/></span>
                                                      <span class="legend-value">7%</span>
                                                  </div>
                                                  <div class="legend-entry">
                                                      <span class="dot other"></span>
                                                      <span><t t-esc="_t('Other')"/></span>
                                                      <span class="legend-value">18%</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Dashboard Content -->
                
                      <!-- Visitor status Section -->
                      <div class="visitor-status">
                            <div class="section-header">
                                <h2 class="main-section-title"><t t-esc="_t('Visitor Status')"/></h2>
                                    <div class="analysis-period-info">
                                        <span t-esc="state.forecastData.analysis_period"/>
                                </div>
                            </div>
                          <div class="visitor-section">
                              <div class="visitor-trend">
                                  <div class="chart-header">
                                      <div class="chart-title-section">
                                            <div class="title-with-tooltip">
                                              <h3><t t-esc="_t('Visitor Trends')"/></h3>
                                            </div>
                                            <div class="chart-meta">
                                              <span class="period-text"><t t-esc="state.simpleLast30DaysLabel"/></span>
                                            </div>
                                      </div>
                                      <div class="time-period-buttons">
                                          <button class="period-btn" t-att-class="state.selectedPeriod === '7days' ? 'active' : ''" t-on-click="() => this.setPeriod('7days')"><t t-esc="_t('Last 7 Days')"/></button>
                                          <button class="period-btn" t-att-class="state.selectedPeriod === '30days' ? 'active' : ''" t-on-click="() => this.setPeriod('30days')"><t t-esc="_t('Last 30 Days')"/></button>
                                      </div>
                                  </div>
                                  <div class="visitor-trend-graph">
                                      <div class="o_dashboard_sales">
                                          <canvas t-ref="visitorChart"/>
                                      </div>
                                  </div>
                                  <div class="visitor-trend-card-container">
                                      <div class="visitor-trend-card">
                                          <div class="visitor-numbers">
                                              <span class="trend-card-title"><t t-esc="_t('Total visitors')"/></span>
                                              <span class="trend-card-title">9,000</span>
                                          </div>
                                          <div class="trend-wrapper sales-numbers">
                                              <span class="trend-card-title"><t t-esc="_t('Compared to last year')"/></span>
                                              <div class="trend-indicator trend-up">
                                                  <span class="trend-icon">▲</span>
                                                  <span t-esc="state.performanceData.sales_performance.monthly_trend"/>
                                              </div>
                                          </div>                                             
                                      </div>
                                      
                                      <div class="visitor-trend-card">
                                          <div class="visitor-numbers">
                                              <span class="trend-card-title"><t t-esc="_t('Total visitors by section')"/></span>
                                              <span class="trend-card-title">4,500</span>
                                          </div>
                                      </div>
                                  </div>
                              </div> 
                              
                              <div class="visitor-info">
                                  <div class="age-trend-graph">
                                       <div class="chart-header">
                                            <div class="chart-title-section">
                                                <div class="title-with-tooltip">
                                                    <h3><t t-esc="_t('Visitor Ratio by Age Group')"/></h3>
                                                </div>
                                            </div>
                                        </div>
                                      <div class="o_dashboard_sales">
                                          <canvas t-ref="ageChart"/>
                                      </div>
                                  </div>

                                  <div class="card-gender">
                                              <div class="card-body">
                                                <h3 class="mb-3"><t t-esc="_t('Gender Ratio')"/></h3>
                                                <div class="d-flex justify-content-center gap-5">
                                                  
                                                  <!-- Male -->
                                                  
                                                      <div class="figure">
                                                        <div class="male-percentage" id="malePercent">62%</div>
                                                        <div class="svg-wrapper">
                                                          <svg viewBox="0 0 200 400" preserveAspectRatio="xMidYMid meet">
                                                            <!-- Grey silhouette -->  
                                                            <path d="M100 20c25 0 45 20 45 45s-20 45-45 45-45-20-45-45 20-45 45-45zm-25 90h50c30 0 55 25 55 55v70c0 10-8 18-18 18h-15v127h-40v-80h-10v80h-40V253H42c-10 0-18-8-18-18v-70c0-30 25-55 55-55z" fill="#eee"/>
                                                            <!-- Blue fill -->
                                                            <clipPath id="maleClip">
                                                              <path d="M100 20c25 0 45 20 45 45s-20 45-45 45-45-20-45-45 20-45 45-45zm-25 90h50c30 0 55 25 55 55v70c0 10-8 18-18 18h-15v127h-40v-80h-10v80h-40V253H42c-10 0-18-8-18-18v-70c0-30 25-55 55-55z"/>
                                                            </clipPath>
                                                            <rect id="maleFill" class="fill" x="0" y="400" width="200" height="0" clip-path="url(#maleClip)"/>
                                                          </svg>
                                                        </div>
                                                        <div class="label"><t t-esc="_t('Male')"/></div>
                                                      </div>

                                                  <!-- Female -->
                                                  <div class="figure">
                                                      <div class="female-percentage" id="femalePercent">38%</div>
                                                      <div class="svg-wrapper">
                                                        <svg viewBox="0 0 200 400" preserveAspectRatio="xMidYMid meet">
                                                          <!-- Grey silhouette -->
                                                          <path d="M100 20c25 0 45 20 45 45s-20 45-45 45-45-20-45-45 20-45 45-45zm-40 110h80l40 120h-50v110H110v-70H90v70H70V250H20l40-120z" fill="#eee"/>
                                                          <!-- Pink fill -->
                                                          <clipPath id="femaleClip">
                                                            <path d="M100 20c25 0 45 20 45 45s-20 45-45 45-45-20-45-45 20-45 45-45zm-40 110h80l40 120h-50v110H110v-70H90v70H70V250H20l40-120z"/>
                                                          </clipPath>
                                                          <rect id="femaleFill" class="fill female" x="0" y="400" width="200" height="0" clip-path="url(#femaleClip)"/>
                                                        </svg>
                                                      </div>
                                                      <div class="label"><t t-esc="_t('Female')"/></div>
                                                    </div>

                                                </div>
                                              </div>
                                            </div>
                              </div>
                          </div>
                      </div>

                      <!-- Sales Trends Section -->
                      
                            <div class="sales-trends-section">
                                <div class="section-header">
                                    <h2 class="main-section-title"><t t-esc="_t('Sales Status')"/></h2>
                                        <div class="analysis-period-info">
                                            <span t-esc="state.forecastData.analysis_period"/>
                                        </div>
                                </div>
                                
                                <div class="sales-trends">
                                    <div class="chart-header">
                                        <div class="chart-title-section">
                                                <div class="title-with-tooltip">
                                                <h3><t t-esc="_t('Sales Trends')"/></h3>
                                                </div>
                                                <div class="chart-meta">
                                                <span class="period-text"><t t-esc="state.last30DaysTitle"/></span>
                                                </div>
                                        </div>
                                        <div class="time-period-buttons">
                                            <button class="period-btn" t-att-class="state.selectedPeriod === '7days' ? 'active' : ''" t-on-click="() => this.setPeriod('7days')"><t t-esc="_t('Last 7 Days')"/></button>
                                            <button class="period-btn" t-att-class="state.selectedPeriod === '30days' ? 'active' : ''" t-on-click="() => this.setPeriod('30days')"><t t-esc="_t('Last 30 Days')"/></button>
                                        </div>
                                    </div>
                                <div class="sales-trend-graph">
                                    <div class="o_dashboard_sales">
                                        <canvas t-ref="salesChart"/>
                                    </div>
                                </div>
                                <div class="sales-trend-card-container">
                                    <div class="sales-trend-card">
                                        <div class="sales-numbers">
                                            <span class="trend-card-title"><t t-esc="_t('Total Sales')"/></span>
                                            <span class="trend-card-title">1,000,000</span>
                                        </div>
                                        <div class="trend-wrapper sales-numbers">
                                            <span class="trend-card-title"><t t-esc="_t('Compared to last year')"/></span>
                                            <div class="trend-indicator trend-up">
                                                <span class="trend-icon">▲</span>
                                                <span t-esc="state.performanceData.sales_performance.monthly_trend"/>
                                            </div>
                                        </div>                                             
                                    </div>
                                
                                    <div class="sales-trend-card">
                                        <div class="sales-numbers">
                                            <span class="trend-card-title"><t t-esc="_t('Average transaction value')"/></span>
                                            <span class="trend-card-title">190,000</span>
                                        </div>
                                    </div>
                                </div>
                            </div> 
                        </div>
                
              </div>
          </div>
      </div>
  `;

  setup() {
    let rpcService = null;
    try {
      rpcService = useService("rpc");
    } catch (e) {
      console.warn("RPC service not available, using fallback behavior");
    }
    this.rpc = rpcService;
    // Expose _t to the template context
    this._t = _t;

    // All chart references
    this.canvasRef = useRef("salesChart");
    this.visitorRef = useRef("visitorChart");
    this.ageRef = useRef("ageChart");
    this.menuDrawer = useRef("menuDrawer");
    this.reservationTrendChart = useRef("reservationTrendChart");
    this.memberTypeChart = useRef("memberTypeChart");
    this.advanceBookingChart = useRef("advanceBookingChart");
    this.regionalChart = useRef("regionalChart");

    // Chart instances for cleanup
    this.lineChartInstance = null;
    this.salesChartInstance = null;
    this.visitorChartInstance = null;
    this.ageChartInstance = null;
    this.memberTypeInstance = null;
    this.advanceBookingInstance = null;
    this.regionalInstance = null;

    this.state = useState({
      activeMenuItem: "dashboard",
      currentLanguage: "en_US",
      userName: "username",
      gender: {
        male: 60,
        female: 40,
      },
      performanceData: {
        main_title: _t("Cloud CC Core Performance Indicators"),
        sales_performance: {
          title: _t("Sales Performance Indicators"),
          current_revenue: "120,000,000,000",
          monthly_revenue: "100,000,000",
          current_trend: "+11%",
          monthly_trend: "+11%",
          current_label: _t("Cumulative Sales This Year"),
          monthly_label: _t("Current Monthly Sales"),
          trend_period: _t("(year-over-year)"),
        },
        avg_order_value: {
          title: _t("Average Order Value Performance"),
          current_weekly_value: "200,000",
          monthly_value: "200,000",
          current_trend: "+11%",
          monthly_trend: "+13%",
          current_label: _t("Cumulative Unit Price This Year"),
          monthly_label: _t("Current Monthly Guest Price"),
          trend_period: _t("(year-over-year)"),
        },
        utilization_rate: {
          title: _t("Utilization Rate Performance"),
          current_weekly_capacity: "120,000,000,000",
          monthly_capacity: "100,000,000",
          current_trend: "-5%",
          monthly_trend: "+20%",
          current_label: _t("Cumulative Operation Rate This Year"),
          monthly_label: _t("Current Month Operation Rate"),
          trend_period: _t("(year-over-year)"),
        },
      },
      activities: [],
      customer_growth: [],
      drawerOpen: false,
      showWeatherDetails: false,
      currentDate: "",
      userLocation: null,
      weather: {
        temperature: 27,
        precipitation: 0,
        chance: 0,
        icon: "☀️",
        location: "Detecting location...",
      },
      reservations: {
        current: 78,
        total: 80,
      },
      teeTime: {
        part1: { current: 40, total: 50 },
        part2: { current: 25, total: 30 },
        part3: { current: 7, total: 15 },
      },
      hourlyWeather: [],
      reservationDetails: [],
      forecastData: {
        forecast_chart: [],
        calendar_data: [],
        pie_charts: {
          member_composition: {},
          reservation_timing: {},
          region_distribution: {},
        },
        summary_stats: {
          total_reservations: 2926,
          utilization_rate: 78.5,
          month_comparison: { month1: 82.4, month2: 76.2, month3: 75.3 },
          yearly_growth: 10,
        },
        analysis_period: this.generateAnalysisPeriod(),
      },
      last30DaysLabel: "",
      simpleLast30DaysLabel: "",
      last30DaysTitle: "",
      selectedPeriod: "30days",
      showReservationDetails: false,
      selectedSlot: { day: "", period: "", count: 0 },
      // Initialize heatmapData with proper structure
      heatmapData: {
        headers: [
          _t("Sun"),
          _t("Mon"),
          _t("Tue"),
          _t("Wed"),
          _t("Thu"),
          _t("Fri"),
          _t("Sat"),
        ],
        rows: [
          { label: _t("Dawn (5-7 AM)"), data: [0, 0, 0, 0, 0, 0, 0] },
          { label: _t("Morning (8am-12pm)"), data: [0, 0, 0, 0, 0, 0, 0] },
          { label: _t("Afternoon (1-4 PM)"), data: [0, 0, 0, 0, 0, 0, 0] },
          { label: _t("Night (5-7 PM)"), data: [0, 0, 0, 0, 0, 0, 0] },
        ],
      },
    });

    onMounted(() => this.onMounted());
  }

  // Get current locale from saved dashboard language or browser fallback
  getCurrentLocale() {
    let lang = "en-US";
    try {
      const stored = localStorage.getItem("dashboard_lang");
      if (stored === "ko_KR") lang = "ko-KR";
      else if (stored === "en_US") lang = "en-US";
    } catch (e) {}
    return lang;
  }

  // Add this method to generate dynamic analysis period (localized)
  generateAnalysisPeriod() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29); // 30 days total including today

    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    const locale = this.getCurrentLocale();
    const startDateStr = startDate.toLocaleDateString(locale, options);
    const endDateStr = endDate.toLocaleDateString(locale, options);

    return `${_t("Analysis period:")} ${_t("The last 30 days")} (${startDateStr} - ${endDateStr})`;
  }

  async onMounted() {
    // Set current date
    const today = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    this.state.currentDate = today.toLocaleDateString(this.getCurrentLocale(), options);

    try {
      const storedLang = localStorage.getItem("dashboard_lang");
      if (storedLang && (storedLang === "ko_KR" || storedLang === "en_US")) {
        this.state.currentLanguage = storedLang;
      }
    } catch (e) {}

    // Update analysis period and period labels on mount
    this.state.forecastData.analysis_period = this.generateAnalysisPeriod();
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);
    const fmt = { year: "numeric", month: "long", day: "numeric" };
    const locale = this.getCurrentLocale();
    const startStr = startDate.toLocaleDateString(locale, fmt);
    const endStr = endDate.toLocaleDateString(locale, fmt);
    this.state.last30DaysLabel = `${_t("Last 30 Days")} (${startStr} - ${endStr})`;
    this.state.simpleLast30DaysLabel = `(${_t("Last 30 Days")})`;
    this.state.last30DaysTitle = _t("Last 30 Days");

    // Initialize heatmap data first
    this.setDefaultForecastData();

    // Detect user location first
    await this.detectUserLocation();

    // Fetch dashboard data
    await this.fetchDashboardData();

    // Fetch performance indicators data
    await this.fetchPerformanceData();

    // Add forecast data
    await this.fetchForecastData();

    // Initialize all charts at once
    this.initializeCharts();

    document.addEventListener("click", this.handleOutsideDrawer.bind(this));
  }

  // Add setActiveMenuItem method
  setActiveMenuItem(item) {
    this.state.activeMenuItem = item;
  }

  async fetchDashboardData() {
    let data = {
      customer_growth: [60, 40, 20, 80, 50, 70, 90, 30, 40, 55, 75, 85],
      activities: [
        "13 mins ago - New Reservation",
        "1 hour ago - 2 New Leads",
        "Today - 3 SMS Campaigns",
      ],
    };

    if (this.rpc) {
      try {
        data = await this.rpc("/golfzon/dashboard/data");
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    }

    this.state.activities = data.activities;
    this.state.customer_growth = data.customer_growth;
  }

  // Forecast data methods
  async fetchForecastData() {
    if (this.rpc) {
      try {
        const forecastData = await this.rpc(
          "/golfzon/dashboard/reservation_forecast"
        );
        if (forecastData.success) {
          this.state.forecastData = forecastData;
        }
      } catch (error) {
        console.error("Error fetching forecast data:", error);
        this.setDefaultForecastData();
      }
    } else {
      this.setDefaultForecastData();
    }
  }

  setDefaultForecastData() {
    // Generate sample data for line chart
    const chartData = [];
    const calendarData = [];
    const today = new Date();

    // Realistic reservation numbers for different time periods
    const timeSlotRanges = {
      dawn: { min: 5, max: 29 },
      morning: { min: 8, max: 28 },
      afternoon: { min: 10, max: 28 },
      night: { min: 15, max: 44 },
    };

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - 30 + i);

      chartData.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        day: date.getDate(),
        reservations: 40 + Math.random() * 80,
        temperature: 20 + Math.random() * 15,
        precipitation: Math.random() > 0.7 ? Math.random() * 30 : 0,
      });

      // Generate realistic reservation data for calendar
      const dawnReservations =
        Math.floor(
          Math.random() *
            (timeSlotRanges.dawn.max - timeSlotRanges.dawn.min + 1)
        ) + timeSlotRanges.dawn.min;
      const morningReservations =
        Math.floor(
          Math.random() *
            (timeSlotRanges.morning.max - timeSlotRanges.morning.min + 1)
        ) + timeSlotRanges.morning.min;
      const afternoonReservations =
        Math.floor(
          Math.random() *
            (timeSlotRanges.afternoon.max - timeSlotRanges.afternoon.min + 1)
        ) + timeSlotRanges.afternoon.min;
      const nightReservations =
        Math.floor(
          Math.random() *
            (timeSlotRanges.night.max - timeSlotRanges.night.min + 1)
        ) + timeSlotRanges.night.min;

      calendarData.push({
        date: date.getDate(),
        weekday: ["S", "M", "T", "W", "T", "F", "S"][date.getDay()],
        early_morning: dawnReservations,
        morning: morningReservations,
        afternoon: afternoonReservations,
        evening: nightReservations,
        total:
          dawnReservations +
          morningReservations +
          afternoonReservations +
          nightReservations,
        intensity: "medium",
      });
    }

    this.state.forecastData.forecast_chart = chartData;
    this.state.forecastData.calendar_data = calendarData;
    this.state.forecastData.pie_charts = {
      member_composition: {
        individual: 76,
        corporate: 13,
        junior: 2,
        senior: 8,
        vip: 1,
      },
      reservation_timing: {
        d15_plus: 43,
        d14: 17,
        d7: 26,
        d3: 7,
        d1: 6,
        d0: 1,
      },
      region_distribution: {
        downtown: 48,
        uptown: 19,
        suburbs: 8,
        outskirts: 7,
        others: 18,
      },
    };

    // Generate realistic heatmap data
    const daysOfWeek = [
      _t("Sun"),
      _t("Mon"),
      _t("Tue"),
      _t("Wed"),
      _t("Thu"),
      _t("Fri"),
      _t("Sat"),
    ];
    const timeSlots = [
      { label: _t("Dawn (5-7 AM)"), min: 5, max: 29 },
      { label: _t("Morning (8am-12pm)"), min: 8, max: 28 },
      { label: _t("Afternoon (1-4 PM)"), min: 10, max: 28 },
      { label: _t("Night (5-7 PM)"), min: 15, max: 44 },
    ];

    const heatmapData = {
      headers: daysOfWeek,
      rows: timeSlots.map((slot) => {
        const rowData = daysOfWeek.map(
          () => Math.floor(Math.random() * (slot.max - slot.min + 1)) + slot.min
        );
        return {
          label: slot.label,
          data: rowData,
        };
      }),
    };

    // Update state with the new heatmap data
    this.state.heatmapData = heatmapData;
  }

  setPeriod(period) {
    this.state.selectedPeriod = period;
    this.updateLineChart();
  }

  getHeatmapCellClass(value) {
    if (typeof value !== "number") return "bottom-20";

    if (value >= 35) return "top-20";
    if (value >= 25) return "top-20-40";
    if (value >= 18) return "median-20";
    if (value >= 10) return "bottom-20-40";
    return "bottom-20";
  }

  showReservationDetails(timePeriod, dayIndex, count, event) {
    event.stopPropagation();
    const days = [
      _t("Sun"),
      _t("Mon"),
      _t("Tue"),
      _t("Wed"),
      _t("Thu"),
      _t("Fri"),
      _t("Sat"),
    ];

    this.state.selectedSlot = {
      day: days[dayIndex],
      period: timePeriod,
      count: count,
    };
    this.state.showReservationDetails = true;

    // Position the details panel near the clicked cell
    const rect = event.target.getBoundingClientRect();
    this.state.detailsPosition = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
    };
  }

  closeReservationDetails() {
    this.state.showReservationDetails = false;
  }

  updateLineChart() {
    // Clear existing chart
    if (this.lineChartInstance) {
      this.lineChartInstance.destroy();
    }
    // Reinitialize with new data
    this.initializeLineChart();
  }

  async detectUserLocation() {
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 600000, // 10 minutes
          });
        });

        const lat = position.coords.latitude.toString();
        const lon = position.coords.longitude.toString();

        this.state.userLocation = { lat, lon };

        // Get location name
        if (this.rpc) {
          try {
            const locationData = await this.rpc(
              "/golfzon/dashboard/detect_location",
              {
                lat: lat,
                lon: lon,
              }
            );
            if (locationData.success) {
              this.state.weather.location = locationData.location;
            }
          } catch (error) {
            console.warn("Location name detection failed:", error);
          }
        }

        // Fetch weather data for user's location
        await this.fetchGolfData(lat, lon);
      } else {
        throw new Error("Geolocation not supported");
      }
    } catch (error) {
      console.warn("Location detection failed:", error);
      this.state.weather.location = "Location access denied - using default";
      // Use fallback location (Mumbai)
      await this.fetchGolfData();
    }
  }

  async fetchGolfData(lat = null, lon = null) {
    if (this.rpc) {
      try {
        const golfData = await this.rpc("/golfzon/dashboard/golf_info", {
          lat: lat,
          lon: lon,
        });

        // Update weather with location info
        this.state.weather = {
          ...golfData.weather,
          location: golfData.weather.location || this.state.weather.location,
        };
        this.state.reservations = golfData.reservations;
        this.state.teeTime = golfData.teeTime;
        this.state.hourlyWeather = golfData.hourlyWeather;
        this.state.reservationDetails = golfData.reservationDetails;
      } catch (error) {
        console.error("Error fetching golf data:", error);
        this.setDefaultGolfData();
      }
    } else {
      this.setDefaultGolfData();
    }
  }

  setDefaultGolfData() {
    // Default hourly weather data for 24 hours
    const baseTime = new Date();
    baseTime.setMinutes(0, 0, 0);

    this.state.hourlyWeather = [];
    for (let i = 0; i < 24; i++) {
      const time = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
      this.state.hourlyWeather.push({
        time: time.toTimeString().substring(0, 5),
        icon: i < 6 || i > 18 ? "🌙" : i > 10 && i < 16 ? "☀️" : "⛅",
        temperature: Math.round(20 + Math.sin(((i - 6) * Math.PI) / 12) * 8),
        precipitation: Math.random() > 0.8 ? Math.floor(Math.random() * 10) : 0,
        chance: Math.floor(Math.random() * 30),
      });
    }

    // Generate 80 reservation details
    const names = [
      _t("John Smith"),
      _t("Sarah Johnson"),
      _t("Mike Wilson"),
      _t("Emily Davis"),
      _t("David Brown"),
      _t("Lisa Anderson"),
      _t("Tom Garcia"),
      _t("Anna Martinez"),
      _t("Chris Lee"),
      _t("Jessica Taylor"),
      _t("Robert Chen"),
      _t("Maria Rodriguez"),
      _t("Kevin Park"),
      _t("Amanda White"),
      _t("Daniel Kim"),
      _t("Rachel Green"),
      _t("James Wilson"),
      _t("Michelle Brown"),
      _t("Steven Clark"),
      _t("Jennifer Lopez"),
    ];

    this.state.reservationDetails = [];
    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < 80; i++) {
      const startHour = 6 + i * 0.25;
      const hour = Math.floor(startHour);
      const minute = Math.floor((startHour - hour) * 60);
      const teeTime = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;

      this.state.reservationDetails.push({
        id: `R${(i + 1).toString().padStart(3, "0")}`,
        person: names[i % names.length],
        date: today,
        teeTime: teeTime,
        rounds: Math.random() > 0.5 ? 18 : 9,
      });
    }
  }

  async fetchPerformanceData() {
    if (this.rpc) {
      try {
        const performanceData = await this.rpc(
          "/golfzon/dashboard/performance_indicators"
        );
        this.state.performanceData = performanceData;
      } catch (error) {
        console.error("Error fetching performance data:", error);
      }
    }
  }

  toggleWeatherDetails() {
    this.state.showWeatherDetails = !this.state.showWeatherDetails;
  }

  toggleDrawer(ev) {
    ev.stopPropagation();
    this.state.drawerOpen = !this.state.drawerOpen;
    if (this.menuDrawer.el) {
      this.menuDrawer.el.classList.toggle("open", this.state.drawerOpen);
    }
  }

  handleOutsideDrawer(ev) {
    if (
      this.state.drawerOpen &&
      this.menuDrawer.el &&
      !ev.target.closest(".menu-drawer") &&
      !ev.target.closest(".menu-btn")
    ) {
      this.state.drawerOpen = false;
      this.menuDrawer.el.classList.remove("open");
    }
  }

  logout() {
    window.location.href = "/web/session/logout";
  }

  switchLanguage(lang) {
    this.state.currentLanguage = lang;
    try {
      localStorage.setItem("dashboard_lang", lang);
    } catch (e) {}
    // Hit backend to persist lang in session/user, then redirect to dashboard
    const target = `/golfzon/dashboard/set_lang?lang=${encodeURIComponent(lang)}`;
    window.location.assign(target);
  }

  // CONSOLIDATED CHART INITIALIZATION - ALL IN ONE PLACE
  initializeCharts() {
    if (window.Chart && window.ChartDataLabels) {
      Chart.register(window.ChartDataLabels);
    }

    try {
      console.log("Initializing all charts...");

      // 1. LINE CHART (Reservation Trends)
      this.initializeLineChart();

      // 4. SALES CHART
      if (this.canvasRef.el) {
        if (this.salesChartInstance) this.salesChartInstance.destroy();
        this.salesChartInstance = new Chart(
          this.canvasRef.el.getContext("2d"),
          {
            type: "bar",
            data: {
              labels: [
                "5.2",
                "5.22",
                "5.25",
                "5.28",
                "5.3",
                "5.32",
                "5.35",
                "5.38",
                "5.4",
                "5.42",
                "5.45",
                "5.48",
                "5.5",
                "5.52",
                "5.55",
                "5.58",
                "5.6",
                "5.62",
                "5.65",
                "5.68",
                "5.7",
                "5.75",
                "6.1",
              ],
              datasets: [
                {
                  label: _t("Sales"),
                  data: [
                    320, 450, 220, 150, 390, 600, 550, 400, 375, 500, 650, 700,
                    480, 520, 610, 580, 450, 400, 300, 350, 400, 480, 600,
                  ],
                  backgroundColor: "rgba(4, 109, 236, 1)",
                  borderRadius: {
                    topLeft: 12,
                    topRight: 12,
                    bottomLeft: 0,
                    bottomRight: 0,
                  },
                  borderSkipped: "bottom",
                  barPercentage: 0.65,
                  categoryPercentage: 0.5,
                },
                {
                  label: _t("Last Year's Sales (Same Period)"),
                  data: [
                    220, 300, 210, 200, 220, 480, 450, 350, 300, 450, 500, 550,
                    400, 450, 500, 480, 350, 300, 250, 300, 350, 400, 450,
                  ],
                  backgroundColor: "rgba(134, 229, 245, 1)",
                  borderRadius: {
                    topLeft: 12,
                    topRight: 12,
                    bottomLeft: 0,
                    bottomRight: 0,
                  },
                  borderSkipped: "bottom",
                  barPercentage: 0.65,
                  categoryPercentage: 0.5,
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                tooltip: { enabled: false },
                legend: {
                  display: true,
                  position: "bottom",
                  labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 4,
                    boxHeight: 4,
                    padding: 15,
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: {
                    callback: function (val, index, ticks) {
                      if (index === 0 || index === ticks.length - 1) {
                        return this.getLabelForValue(val);
                      }
                      return "";
                    },
                  },
                },
                y: {
                  grid: { display: true, drawBorder: false, color: "#EFEFEF" },
                  beginAtZero: true,
                  max: 700,
                  ticks: { stepSize: 100 },
                },
              },
            },
          }
        );
        console.log("Sales chart initialized");
      }

      // 5. VISITOR CHART
      if (this.visitorRef.el) {
        if (this.visitorChartInstance) this.visitorChartInstance.destroy();
        this.visitorChartInstance = new Chart(
          this.visitorRef.el.getContext("2d"),
          {
            type: "line",
            data: {
              labels: [
                "5.2",
                "5.25",
                "5.3",
                "5.35",
                "5.4",
                "5.45",
                "5.5",
                "5.6",
                "5.7",
                _t("6.1(Today)"),
              ],
              datasets: [
                {
                  label: _t("2025 Visitors"),
                  data: [200, 180, 250, 400, 600, 450, 320, 340, 360, 500],
                  borderColor: "#046DEC",
                  backgroundColor: "transparent",
                  borderWidth: 2,
                  tension: 0.4,
                  pointRadius: 0,
                  pointBackgroundColor: "white",
                  pointBorderColor: "#046DEC",
                  pointBorderWidth: 2,
                },
                {
                  label: _t("2024 Visitors"),
                  data: [150, 130, 120, 140, 160, 180, 170, 150, 140, 130],
                  borderColor: "#86E5F5",
                  backgroundColor: "transparent",
                  borderWidth: 2,
                  tension: 0.4,
                  pointRadius: 0,
                  pointBackgroundColor: "white",
                  pointBorderColor: "#86E5F5",
                  pointBorderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "nearest", intersect: false },
              onClick: (event, activeEls, chart) => {
                const points = chart.getElementsAtEventForMode(
                  event,
                  "nearest",
                  { intersect: false },
                  true
                );
                if (points.length) {
                  const datasetIndex = points[0].datasetIndex;
                  const index = points[0].index;
                  const dataset = chart.data.datasets[datasetIndex];
                  dataset.pointRadius = dataset.data.map(() => 0);
                  dataset.pointRadius[index] = 7;
                  chart.update();
                }
              },
              plugins: {
                legend: {
                  display: true,
                  position: "bottom",
                  labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 4,
                    boxHeight: 4,
                    padding: 16,
                    generateLabels: (chart) => {
                      const labels =
                        Chart.defaults.plugins.legend.labels.generateLabels(
                          chart
                        );
                      labels.forEach((l) => {
                        l.pointStyle = "circle";
                        l.fillStyle =
                          chart.data.datasets[l.datasetIndex].borderColor;
                        l.strokeStyle =
                          chart.data.datasets[l.datasetIndex].borderColor;
                      });
                      return labels;
                    },
                  },
                },
                tooltip: {
                  enabled: true,
                  position: "nearest",
                  yAlign: "bottom",
                  displayColors: false,
                  callbacks: {
                    label: function (context) {
                      return _t("Visitors") + ": " + context.raw.toLocaleString();
                    },
                  },
                },
              },
              scales: {
                x: {
                  ticks: {
                    callback: function (value, index, ticks) {
                      if (index === 0 || index === ticks.length - 1) {
                        return this.getLabelForValue(value);
                      }
                      return "";
                    },
                  },
                  grid: { display: false },
                },
                y: {
                  min: 0,
                  max: 700,
                  ticks: { stepSize: 100 },
                  grid: { color: "#e0e0e0" },
                },
              },
            },
          }
        );
        console.log("Visitor chart initialized");
      }

      // 6. AGE CHART
      if (this.ageRef.el) {
        if (this.ageChartInstance) this.ageChartInstance.destroy();
        this.ageChartInstance = new Chart(this.ageRef.el.getContext("2d"), {
          type: "bar",
          data: {
            labels: ["60+ years", "50s", "40s", "30s", "20s", "Under 10"],
            datasets: [
              {
                label: _t("Visitor Ratio"),
                data: [22, 27, 20, 20, 9, 2],
                backgroundColor: [
                  "#4489DA",
                  "#1958A4",
                  "#4C9CFD",
                  "#4C9CFD",
                  "#3A96D4",
                  "#5AB4F0",
                ],
                borderRadius: 15,
                barThickness: 25,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: true },
            },
            scales: {
              x: {
                beginAtZero: true,
                max: 30,
                ticks: { callback: (value) => value + "%" },
              },
              y: { ticks: { font: { size: 14 } } },
            },
          },
        });
        console.log("Age chart initialized");
      }

      // 7. PIE CHARTS (Inline implementation)
      this.initializePieCharts();

      console.log("All charts initialized successfully");
    } catch (chartError) {
      console.error("Error initializing charts:", chartError);
    }
  }

  // LINE CHART METHOD - Updated with dot legends
  initializeLineChart() {
    if (!this.reservationTrendChart.el) {
      console.warn("Reservation trend chart element not found");
      return;
    }

    const ctx = this.reservationTrendChart.el.getContext("2d");

    if (this.lineChartInstance) {
      this.lineChartInstance.destroy();
    }

    const currentYearData = [40, 50, 45, 60, 55, 70, 65, 80, 75, 90];
    const lastYearData = [35, 42, 38, 48, 45, 58, 52, 65, 60, 70];

    this.lineChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["6.1(Today)", "", "", "", "", "", "", "", "", "6.30"],
        datasets: [
          {
            label: _t("Reservations"),
            data: currentYearData,
            borderColor: "#2196f3",
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: "#2196f3",
          },
          {
            label: _t("Reservations (Same period last year)"),
            data: lastYearData,
            borderColor: "#81d4fa",
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: "#81d4fa",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        scales: {
          y: {
            beginAtZero: true,
            max: 120,
            ticks: {
              stepSize: 20,
              callback: function (value) {
                return value;
              },
            },
          },
          x: {
            ticks: {
              callback: function (value, index, ticks) {
                if (index === 0 || index === ticks.length - 1) {
                  return this.getLabelForValue(value);
                }
                return "";
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              padding: 20,
            },
          },
          tooltip: {
            enabled: true,
            mode: "nearest",
            intersect: false,
            callbacks: {
              title: function (context) {
                const date = new Date();
                const days = [
                  _t("Day"),
                  _t("Month"),
                  _t("Fury"),
                  _t("Number"),
                  _t("Neck"),
                  _t("Gold"),
                  _t("Saturday"),
                ];
                const months = [
                  _t("January"),
                  _t("February"),
                  _t("March"),
                  _t("April"),
                  _t("May"),
                  _t("June"),
                  _t("July"),
                  _t("August"),
                  _t("September"),
                  _t("October"),
                  _t("November"),
                  _t("December"),
                ];
                return `${days[date.getDay()]}, ${
                  months[date.getMonth()]
                } ${date.getDate()}, ${date.getFullYear()}`;
              },
              label: function (context) {
                return `Reservations: ${context.parsed.y}`;
              },
              afterLabel: function (context) {
                return ["Weather: Rain, 00mm", "Temperature: 18°-28°C"];
              },
            },
            titleFont: { size: 12, weight: "bold" },
            bodyFont: { size: 11 },
            padding: 12,
            backgroundColor: "rgba(0,0,0,0.8)",
            borderColor: "#2196f3",
            borderWidth: 1,
          },
        },
      },
    });
    console.log("Line chart initialized");
  }

  // PIE CHARTS METHOD
  initializePieCharts() {
    // Member Type Chart
    if (this.memberTypeChart.el) {
      if (this.memberTypeInstance) this.memberTypeInstance.destroy();
      this.memberTypeInstance = new Chart(
        this.memberTypeChart.el.getContext("2d"),
        {
          type: "doughnut",
          data: {
            datasets: [
              {
                data: [76, 13, 2, 8, 1],
                backgroundColor: ["#1958a4", "#4489da", "#4c9cfd", "#3a96d4"],
                borderWidth: 0,
                cutout: "60%",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          },
        }
      );
      console.log("Member type pie chart initialized");
    }

    // Advance Booking Chart
    if (this.advanceBookingChart.el) {
      if (this.advanceBookingInstance) this.advanceBookingInstance.destroy();
      this.advanceBookingInstance = new Chart(
        this.advanceBookingChart.el.getContext("2d"),
        {
          type: "doughnut",
          data: {
            datasets: [
              {
                data: [43, 17, 26, 7, 6, 1],
                backgroundColor: [
                  "#1958a4",
                  "#4489da",
                  "#4c9cfd",
                  "#3a96d4",
                  "#5ab4f0",
                  "#91d3ff",
                ],
                borderWidth: 0,
                cutout: "60%",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          },
        }
      );
      console.log("Advance booking pie chart initialized");
    }

    // Regional Chart
    if (this.regionalChart.el) {
      if (this.regionalInstance) this.regionalInstance.destroy();
      this.regionalInstance = new Chart(
        this.regionalChart.el.getContext("2d"),
        {
          type: "doughnut",
          data: {
            datasets: [
              {
                data: [48, 19, 8, 7, 18],
                backgroundColor: [
                  "#1958a4",
                  "#4489da",
                  "#4c9cfd",
                  "#3a96d4",
                  "#5ab4f0",
                ],
                borderWidth: 0,
                cutout: "60%",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          },
        }
      );
      console.log("Regional pie chart initialized");
    }

    function setGenderPercent(male, female) {
      let maleFill = document.getElementById("maleFill");
      let femaleFill = document.getElementById("femaleFill");

      maleFill.setAttribute("y", 400 - (400 * male) / 100);
      maleFill.setAttribute("height", (400 * male) / 100);
      femaleFill.setAttribute("y", 400 - (400 * female) / 100);
      femaleFill.setAttribute("height", (400 * female) / 100);

      document.getElementById("malePercent").textContent = male + "%";
      document.getElementById("femalePercent").textContent = female + "%";
    }

    // Example values
    setGenderPercent(62, 38);
  }
}

registry.category("actions").add("golfzon.dashboard", GolfzonDashboard);

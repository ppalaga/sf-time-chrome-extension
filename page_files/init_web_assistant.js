(function() {
    window.WebAssistant = null;

    const screen_ids = [];
    const btn_id = 'help4ui5';
    let cfg = null;
    let oHelpBtn = null;
    const ignored_ids = ['SessionInformation', 'SessionTimedOut'];
    const theme_map = {
        sap_horizon: 'horizon',
        sap_horizon_hcw: 'hcw',
        sap_horizon_hcb: 'hcb',
        sap_fiori_3_hcb: 'hcb',
        sap_fiori_3_hcw: 'hcw'
    };

    //function sfsfGuessVersion() {
    //    const version = "1805";
    //
    //    const ab = document.getElementById("aboutBox");
    //    const val = ab && ab.childNodes[9] && ab.childNodes[9].nodeValue;
    //    if (!val) return version;
    //
    //    let match = val.match(/b([1-9][0-9][0-9][0-9]).[0-9]*/);  // "b1708.1256845";
    //    if (match) return match[1];
    //
    //    match = val.match(/ *trunk.20([0-9][0-9])([0-9][0-9]).*/);  // "   trunk.201705xxxx"
    //    return match
    //        ? match[1] + ["02", "02", "05", "05", "05", "08", "08", "08", "11", "11", "11", "02"][match[2] - 1]
    //        : version;
    //}

    // XRAY-5342: speeding up init means we're not waiting until AnimateUtil is available
    // now we need to wait for it here before applying indent, clearing old indent update timeouts before applying the current update
    let indentTO;
    function updateIndent(bIndent, indentWidth) {
        if (indentTO) clearTimeout(indentTO);
        // make room for the side panel
        const au = sap.sf?.surj?.shell?.util?.AnimateUtil;
        if (!au) {
            indentTO = setTimeout(updateIndent, 500, bIndent, indentWidth);
            return;
        }
        if (bIndent) {
            au.createSideSpace(indentWidth, null);
        } else {
            au.resetSideSpace(null);
        }
    }

    // XRAY-3313
    // removes byte-order mark (%EF%BB%BF) zero width space characters
    function removeZeroWidthSpaceCharacters(appName) {
        if (Help4.isArray(appName)) appName = appName.join('#');
        if (typeof appName === 'string') appName = appName.replace(/[\ufeff]/g, '');
        return appName;
    }

    function _shellHeaderMigration() {
        // XRAY-3895: switch to new Web Components header
        // migrate old recordings into new ones on the fly

        // convert stable DataAttrSelector v3 recordings into v4
        const migrationMap1 = {
            "DIV[data-help-id='bizxHeaderCompanyLogo']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='shellbar']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='logo']"
                    }
                }
            },
            "BUTTON[data-help-id='bizxHeaderShowMeBtn']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='shellbar']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='ShowMe']"
                    }
                }
            },
            "BUTTON[data-help-id='bizxHeaderUserMenuButton']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='shellbar']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='profile']"
                    }
                }
            },
            "BUTTON[data-help-id='bizxHeaderNotificationButton']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='shellbar']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='notifications']"
                    }
                }
            },
            "BUTTON[data-help-id='bizXShellFeedbackButton']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='shellbar']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='Feedback']"
                    }
                }
            },
            "BUTTON[data-help-id='bizxHeaderTodoButton']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='shellbar']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='Todos']"
                    }
                }
            },
            "BUTTON[data-help-id='enaWebAssistantHelpButton']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='shellbar']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='Item-enaWebAssistantHelpButton']"
                    }
                }
            },
            "DIV[data-help-id='bizxHeaderSearchField']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='SearchField']"
                }
            },
            "BUTTON[data-help-id='bizxHeaderModulePicker']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='shellbar']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='menu']"
                    }
                }
            }
        };

        // convert WA 3.1 stable DataAttrSelector v3 recordings into v4
        // those are recorded with *[data-help-id=...]
        // instead of e.g. BUTTON[data-help-id=...] from above
        const migrationMap1_1 = {};

        // convert TextSelector v3 recordings into v4
        const migrationMap2 = {
            menu_Home: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-HOME']"
                }
            },
            menu_SAPJam: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-JAM']"
                }
            },
            menu_Objectives: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-GOAL']"
                }
            },
            menu_Performance: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-PERFORMANCE']"
                }
            },
            menu_ContinuousPerformance: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-UXR_CONTINUOUS_PERFORMANCE_MANAGEMENT']"
                }
            },
            menu_ContinuousFeedback: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-UXR_CONTINUOUS_FEEDBACK']"
                }
            },
            menu_Calibration: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-CALIBRATION']"
                }
            },
            menu_Compensation: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-COMPENSATION']"
                }
            },
            menu_Learning: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-LEARNING']"
                }
            },
            menu_Careers: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-CAREERS']"
                }
            },
            menu_Succession: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-SUCCESSION']"
                }
            },
            menu_Recruiting: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-RECRUITING']"
                }
            },
            menu_Presentations: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-TALENTREVIEW']"
                }
            },
            menu_MyTeams: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-DYNAMIC_TEAMS']"
                }
            },
            menu_CompanyInfo: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-COMPANY_INFO']"
                }
            },
            menu_MyEmployeeFile: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-EMPLOYEE_FILE']"
                }
            },
            menu_Reports: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-REPORT']"
                }
            },
            menu_AdminCenter: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-ADMIN']"
                }
            },
            menu_CustomExternalModule: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-CUSTOM_EXTERNAL']"
                }
            },
            menu_pickerextnew: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-5']"
                }
            },
            menu_pickerextcurr: {
                value: "*[data-ui5-stable='shellbar-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='Module-6']"
                }
            },

            user_proxy: {
                value: "*[data-ui5-stable='shellbar-profile-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='profile-item-PROXY_NOW']"
                }
            },
            user_suggestions: {
                value: "*[data-ui5-stable='shellbar-profile-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='profile-item-FEEDBACK']"
                }
            },
            user_settings: {
                value: "*[data-ui5-stable='shellbar-profile-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='profile-item-OPTIONS']"
                }
            },
            user_admin: {
                value: "*[data-ui5-stable='shellbar-profile-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='profile-item-ADMIN']"
                }
            },
            user_version: {
                value: "*[data-ui5-stable='shellbar-profile-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='profile-item-SHOW_VERION_INFO']"
                }
            },
            user_logout: {
                value: "*[data-ui5-stable='shellbar-profile-static']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='profile-item-LOGOUT']"
                }
            }
        };

        // convert SFSF_StableIdSelector v3 recordings into v4
        const migrationMap3 = {
            "INPUT[id='bizXSearchField-I']": {
                value: "*[data-ui5-stable='sf-header-shellbar']",
                shadow: {
                    rule: "DataAttrSelector",
                    value: "*[data-ui5-stable='SearchField']",
                    shadow: {
                        rule: "DataAttrSelector",
                        value: "*[data-ui5-stable='input']"
                    }
                }
            }
        };

        // more SFSF_StableIdSelector conversion for bizxSubTab
        // old: A[id='bizxSubTab_COMP_SPOT_AWARDS_USER']
        // new: *[data-ui5-stable='sf-header-shellbar'] / *[data-ui5-stable='subnav'] / *[data-ui5-stable='bizxSubTab_COMP_SPOT_AWARDS_USER']
        const migration3_1 = function(selector) {
            let m;
            if (selector.rule === 'SFSF_StableIdSelector' &&
                (m = selector.value.match(/(?:^[^\[]+\[id)(=['"]bizxSubTab_.+)/)))
            {
                return {
                    value: '*[data-ui5-stable="sf-header-shellbar"]',
                    shadow: {
                        rule: 'DataAttrSelector',
                        value: '*[data-ui5-stable="subnav"]',
                        shadow: {
                            rule: 'DataAttrSelector',
                            value: '*[data-ui5-stable' + m[1]
                        }
                    }
                };
            }

            return null;
        }

        // v3 Text Selectors have different keys per language but
        // same DataAttrSelector in v4
        const similarKeyMap = {
            menu_Home: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Home 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Startseite 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"HalamanMuka 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"LamanUtama 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pàginad’inici 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Domu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Hafan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Hjem 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Inicio 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Accueil 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pocetnastranica 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pagrindinis 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kezdolap 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Startside 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Stronaglówna 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PáginaPrincipal 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Início 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Paginadestart 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Domov 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kotisivu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Hem 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Trangchủ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"AnaSayfa 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Αρχικήσελίδα 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Начало 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Домашняястраница 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Домашня 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"דףהבית 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"الرئيسية 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"मुखपृष्ठ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"หน้าแรก 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"홈 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ホーム 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"主页 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"首頁 0\",\"index\":"
            ],
            menu_SAPJam: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"SAPJam 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"JamSAP 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"SAPजैम 0\",\"index\":"
            ],
            menu_Objectives: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Objectives 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ziele 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Tujuan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Objektif 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Objectius 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Cíle 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Amcanion 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mål 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Objetivos 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Objectifs 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ciljevi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Obiettivi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Uždaviniai 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Célok 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Doelstellingen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Cele 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Obiective 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ciele 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Cilji 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Tavoitteet 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mụctiêu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Hedefler 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Στόχοι 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Цели 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Цілі 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"יעדים 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"الأهداف 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"उद्देश्य 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"วัตถุประสงค์ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"목표 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"目標 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"目标 0\",\"index\":"
            ],
            menu_Performance: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Performance 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Leistung 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kinerja 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prestasi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Acompliment 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Výkon 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Perfformiad 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Præstation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Desempeño 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Performances 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rendement 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Radniucinak 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Veiklosvertinimas 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Teljesítmény 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prestaties 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prestasjon 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Wydajnosc 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Desempenho 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Performanță 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Výkonnost 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Delovnirezultati 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ucinci 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Suoritus 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prestation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"HiệuquảCôngviệc 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Performans 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Απόδοση 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Представяне 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Результативность 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Продуктивність 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ביצועים 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"الأداء 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"प्रदर्शन 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ผลการปฏิบัติงาน 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"성과 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"パフォーマンス 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"绩效 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"績效 0\",\"index\":"
            ],
            menu_ContinuousPerformance: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ContinuousPerformance 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"KontinuierlicheLeistung 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"KinerjaSinambung 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PrestasiBerterusan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Acomplimentcontinu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Trvalývýkon 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PerfformiadParhaus 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Løbendepræstation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Desempeñocontinuo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Performancescontinues 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rendementcontinu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Neprekidniradniucinak 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Performancecontinua 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nuolatinisveiklosvertinimas 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Folyamatosteljesítmény 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Continueprestaties 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kontinuerligprestasjon 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ciaglezarzadzaniewydajnoscia 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Desempenhocontínuo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Performanțăcontinuă 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nepretržitývýkon 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Neprekinjenidelovnirezultati 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Neprekidniucinak 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Jatkuvasuoritus 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kontinuerligprestanda 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"HiệusuấtLiêntục 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"SürekliPerformans 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Συνεχήςαπόδοση 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Непрекъснатопредставяне 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Непрерывнаярезультативность 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Постійнапродуктивність 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ביצועיםמתמשכים 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"الأداءالمستمر 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"सततप्रदर्शन 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ผลการปฏิบัติงานต่อเนื่อง 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"연속성과 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"継続的パフォーマンス 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"持续绩效 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"連續績效 0\",\"index\":"
            ],
            menu_ContinuousFeedback: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ContinuousFeedback 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"KontinuierlichesFeedback 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"UmpanBalikSinambung 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"MaklumbalasBerterusan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Comentariscontinus 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prubežnázpetnávazba 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"AdborthParhaus 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Løbendefeedback 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Retroalimentacióncontinua 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Feedbackcontinuo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Commentairescontinus 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Neprestanepovratneinformacije 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Feedbackcontinuo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nuolatiniaiatsiliepimai 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Folyamatosvisszajelzés 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Continuefeedback 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kontinuerligtilbakemelding 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Opinieciagle 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Feedbackcontínuo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Feedbackcontinuu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nepretržitéspätnáväzba 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Stalnepovratneinformacije 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Jatkuvapalaute 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kontinuerligfeedback 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PhảnhồiLiêntục 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"SürekliGeriBildirim 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Συνεχήςλήψησχολίων 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Непрекъснатаобратнавръзка 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Постояннаяобратнаясвязь 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Постійнийвідгук 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"משובמתמשך 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"الملاحظاتالمستمرة 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"सततप्रतिपुटि 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"คำติชมต่อเนื่อง 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"연속피드백 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"継続的フィードバック 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"连续反馈 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"連續回饋 0\",\"index\":"
            ],
            menu_Calibration: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibration 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibrierung 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibrasi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Penentukuran 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibratge 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibrace 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibro 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibrering 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibración 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Étalonnage 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibrage 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibracija 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibrazione 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibrálás 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibratie 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibracja 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibragem 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibração 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Calibrare 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibrácia 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Umerjanje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibrointi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ĐánhgiáCânđối 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kalibrasyon 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Βαθμονόμηση 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Калибриране 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Калибровка 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Калібрування 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"כיול 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"المعايرة 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"अंशशोधन 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"การปรับเทียบ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"조정 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"調整 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"校准 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"績效校準 0\",\"index\":"
            ],
            menu_Compensation: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Compensation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Vergütung 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kompensasi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pampasan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Compensació 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Odmenování 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PecynBuddion 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Løn 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Compensación 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rémunération 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Naknada 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Retribuzione 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Atlygis 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Javadalmazás 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Beloning 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kompensasjon 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Wynagrodzenie 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Compensação 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Compensare 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kompenzácia 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nadomestilo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kompenzacija 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Palkitseminen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ersättning 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Tiềnlương 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ücretlendirme 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Αποζημίωση 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Компенсация 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Вознаграждение 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Компенсація 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"תגמול 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"التعويض 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"प्रतिफल 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ค่าตอบแทน 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"보상 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"報酬 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"薪酬 0\",\"index\":"
            ],
            menu_Learning: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Learning 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Schulung 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pembelajaran 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Aprenentatge 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Vzdelávání 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Dysgu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Læring 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Aprendizaje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Formation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Apprentissage 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Usavršavanje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Formazione 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mokymasis 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Képzés 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Leren 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Opplæring 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Szkolenie 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Aprendizagem 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Învățare 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Vzdelávanie 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ucneaktivnosti 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ucenje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Oppiminen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Utbildning 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Hoạtđộnghọc 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ögrenme 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Εκμάθηση 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Обучение 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Навчання 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"למידה 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"التعلم 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"शिक्षण 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"การเรียนรู้ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"학습 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"学習 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"学习 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"學習項目 0\",\"index\":"
            ],
            menu_Careers: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Careers 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Karriere 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Karier 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kerjaya 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Carreres 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kariéra 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Gyrfaoedd 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Karrierer 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Carreraprofesional 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Carrières 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Karijere 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Carriere 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Karjera 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Karrier 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Carrières 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Karrierer 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kariera 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Carreiras 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Carreira 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Cariere 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kariéra 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Työurat 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Karriärmöjligheter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nghềnghiệp 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"KariyerFirsatlari 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Σταδιοδρομίες 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Кариери 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Карьера 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Кар’єра 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"קריירות 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"الوظائف 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"कॅरियर 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"อาชีพ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"경력 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"キャリア 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"职业 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"職業 0\",\"index\":"
            ],
            menu_Succession: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Succession 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nachfolge 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Suksesi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Penggantian 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Successió 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Následnictví 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Olyniaeth 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Efterfølger 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sucesión 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Succession 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Relève 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nasljedivanje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Successione 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ipedinyste 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Utánpótlás 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Opvolging 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Etterfølgerplanlegging 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sukcesja 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sucessão 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Succesiuni 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nástupníctvo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nasledstvo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Seuraajasuunnittelu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kếnhiệm 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Yedekleme 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Διαδοχή 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Приемственост 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Преемственность 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Кадровийрезерв 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"מציאתמחליף 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"عمليةإيجادالبديل 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"उत्तराधिकार 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"การสืบทอดตำแหน่ง 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"후임 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"後継者 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"继任计划 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"接班人規劃 0\",\"index\":"
            ],
            menu_Recruiting: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Recruiting 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Perekrutan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Selecció 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nábor 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Recriwtio 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rekruttering 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Reclutamiento 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Recrutement 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Zapošljavanje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Personaloatranka 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Toborzás 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rekrutacja 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Recrutamento 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Recrutare 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kadrovanje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Regrutovanje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rekrytointi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rekrytering 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Tuyểndụng 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"IseAlim 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Προσλήψεις 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Наемане 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Подборперсонала 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Набірперсоналу 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"גיוס 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"تعيين 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"भर्ती 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"การสรรหาบุคลากร 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"채용 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"採用 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"招聘 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"招募 0\",\"index\":"
            ],
            menu_Presentations: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Presentations 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Präsentationen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Presentasi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pembentangan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Presentacions 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prezentace 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Cyflwyniadau 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Præsentationer 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Presentaciones 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Présentations 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prezentacije 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Presentazioni 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pristatymai 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Bemutatók 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Presentaties 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Presentasjoner 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prezentacje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Apresentações 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prezentari 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prezentácie 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Predstavitve 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Esitykset 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Presentationer 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Bảntrìnhbày 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sunular 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Παρουσιάσεις 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Презентации 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Презентації 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"מצגות 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"العروضالتقديمية 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"प्रस्तुतियाँ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"การนำเสนอ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"프리젠테이션 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"プレゼンテーション 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"演示文稿 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"簡報 0\",\"index\":"
            ],
            menu_MyTeams: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"MyTeams 0\",\"index\":"
            ],
            menu_CompanyInfo: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"CompanyInfo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"InformationenzumUnternehmen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"InfoPerusahaan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"MaklumatSyarikat 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informaciódel’empresa 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informaceospolecnosti 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Gwybodaethycwmni 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Firmainfo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informacióndelaempresa 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informationssurl’entreprise 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informationsurl’entreprise 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Podaciotvrtki 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Infoazienda 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Imonesinformacija 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Vállalatiadatok 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Bedrijfsinformatie 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Firmainformasjon 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informacjeofirmie 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informaçãodaempresa 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Empresa 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informațiidesprecompanie 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informácieospolocnosti 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Podatkiopodjetju 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informacijeokompaniji 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Yrityksentiedot 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Organisationsinformation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Thôngtincôngty 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"SirketBilgileri 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Στοιχείαεταιρείας 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Корпоративнаинформация 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Окомпании 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Прокомпанію 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"פרטיחברה 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"معلوماتالشركة 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"कंपनीजानकारी 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ข้อมูลบริษัท 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"회사정보 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"会社情報 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"公司信息 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"公司資訊 0\",\"index\":"
            ],
            menu_MyEmployeeFile: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"MyEmployeeFile 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"MeinePersonaldaten 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"FileKaryawanSaya 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"FailPekerjaSaya 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Elmeufitxerd’empleat 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mojesložkazamestnance 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"FyffeilCyflogai 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"MinMedarbejder-fil 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Miarchivodeempleado 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mondossierd’employé 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mojadatoteka 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ilmiofilepersonale 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Manodarbuotojobyla 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sajátmunkavállalóiadatlap 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mijnmedewerkersbestand 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Minansatt-fil 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mojakartoteka 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"OmeuficheirodeColaborador 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Meuarquivodocolaborador 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Fișierulmeudeangajat 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Môjsúborzamestnanca 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mojadatotekazaposlenega 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Podaciozaposlenom 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Omatyöntekijätiedostoni 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mininfo–Anställd 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"HồsơNhânviêncủaTôi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ÇalisanBilgilerim 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Τοδικόμουαρχείοεργαζομένου 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"МоитефайловеСлужител 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Мойфайл 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Мійфайлпрацівника 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"קובץהעובדשלי 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ملفالموظفالخاصبي 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"मेराकर्मचारीफ़ाइल 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ไฟล์พนักงานของฉัน 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"내직원파일 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"社員ファイル 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"我的员工档案 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"我的員工檔案 0\",\"index\":"
            ],
            menu_Reports: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Reports 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Berichte 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Laporan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Informes 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Reporty 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Adroddiadau 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rapporter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rapports 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Izvješca 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ataskaitos 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Jelentések 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rapporten 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Raporty 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Relatórios 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rapoarte 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Zostavy 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Porocila 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Izveštaji 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Raportit 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rapporter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Báocáo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Raporlar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Αναφορές 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Отчети 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Отчеты 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Звіти 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"דוחות 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"تقارير 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"रिपोर्ट 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"รายงาน 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"보고서 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"レポート 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"报告 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"報表 0\",\"index\":"
            ],
            menu_AdminCenter: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"AdminCenter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"AdminCentre 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Admin-Center 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PusatAdmin 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PusatPentadbiran 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centred’administració 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centrumprosprávu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"CanolfanWeinyddol 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Administrationscenter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centrodeadministración 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centred’administration 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Administracijskicentar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centroamministrazione 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Administravimocentras 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Adminisztrátoriközpont 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Systeembeheer 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Adminsenter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centrumadministratora 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"CentrodeAdministração 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centraldoadministrador 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"CentruAdministrare 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Správcovskécentrum 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Skrbniškosredišce 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Administratorskicentar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pääkäyttäjäkeskus 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Admincenter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"TrungtâmQuảntrị 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"YönetimMerkezi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Κέντροδιαχείρισης 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Администраторскицентър 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Центрадминистрирования 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Центрадміністрування 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"מרכזהניהול 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"مركزالإدارة 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"व्‍यवस्‍थापककेंद्र 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ศูนย์การดูแลระบบ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"운영센터 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"管理センター 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"管理员中心 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"管理中心 0\",\"index\":"
            ],
            menu_pickerextnew: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"picker&extnew 0\",\"index\":"
            ],
            menu_pickerextcurr: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"pickerextcurr 0\",\"index\":"
            ],
            user_proxy: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ProxyNow 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"JetztalsVertreteragieren 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ProxySekarang 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ProksiSekarang 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Personadelegadaara 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Zastupovat 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"DirprwyNawr 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Stedfortræder 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"IniciarSustituto 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Iniciarsustitución 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Agircommeremplaçant 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mandatairemaintenant 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Opunomoćenikkorisnika 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Galitepavaduoti 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Azonnalimeghatalmazott 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Gemachtigdedirect 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Stedfortredernå 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Zastępstwo 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Proxyagora 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Representar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Împuternicitacum 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"AktuálnySprostredkovateľ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Namestnikzdaj 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ovlašćenolicesada 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Edustajanyt 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Agerasomställföreträdarenu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ProxyNgay 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"VekaletÜstlen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Πληρεξούσιοςτώρα 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Пълномощниксега 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Заместитьсейчас 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Заступникзараз 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"התחברבתורמשתמשאחר 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"تفويضالآن 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"अभीप्रॉक्सी 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"พร็อกซีย์เดี๋ยวนี้ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"대리인지금만들기 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"代理の設定 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"即时代理 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"目前代理 0\",\"index\":"
            ],
            user_suggestions: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Suggestions 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Vorschläge 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Öneriler 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Προτάσεις 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Предложения 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Пропозиції 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"הצעות 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"الاقتراحات 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"सुझाव 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"คำแนะนำ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ご提案 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"建議 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"建议 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"제안 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Awgrymiadau 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Cadangan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ehdotukset 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Förslag 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Forslag 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Gợiý 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Javaslatok 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Návrhy 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pasiūlymai 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Predlogi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Predlozi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prijedlozi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Propozycje 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Saran-saran 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sugerencias 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sugestões 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sugestii 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Suggerimenti 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Tilbakemelding 0\",\"index\":"
            ],
            user_settings: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Einstellungen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Settings 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ρυθμίσεις 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Настройки 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Параметры 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"הגדרות 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"सेटिंग \",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"การตั้งค่า 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"設定 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"设置 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"설정 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"0 الإعدادات\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Asetukset 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ayarlar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Beállítások 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Configurações 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Configuració 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Configuración 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Definições 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Gosodiadau 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Impostazioni 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Indstillinger 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Innstillingerfor 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Inställningar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Instellingen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nastavení 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nastavenia 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nastavitve 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Nustatymai 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Paramètres 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Podešavanja 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prijedlozi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Setări 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Setelan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Tetapan 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Thiếtlập 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Ustawienia 0\",\"index\":"
            ],
            user_admin: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"AdminCenter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Admin-Center 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PusatAdmin 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"PusatPentadbiran 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centred’administració 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centrumprosprávu 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"CanolfanWeinyddol 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Administrationscenter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"AdminCentre 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centrodeadministración 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centred’administration 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Administracijskicentar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centroamministrazione 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Administravimocentras 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Adminisztrátoriközpont 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Systeembeheer 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Adminsenter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centrumadministratora 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"CentrodeAdministração 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Centraldoadministrador 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"CentruAdministrare 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Správcovskécentrum 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Skrbniškosredišče 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Administratorskicentar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pääkäyttäjäkeskus 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Admincenter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"TrungtâmQuảntrị 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"YönetimMerkezi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Κέντροδιαχείρισης 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Администраторскицентър 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Центрадминистрирования 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Центрадміністрування 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"מרכזהניהול 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"مركزالإدارة 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"व्‍यवस्‍थापककेंद्र 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ศูนย์การดูแลระบบ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"운영센터 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"管理センター 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"管理员中心 \",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"管理中心 0\",\"index\":"
            ],
            user_version: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Showversioninformation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Versionsinformationenanzeigen 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Εμφάνισηπληροφοριώνέκδοσης 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Покажиинформациязаверсия 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Показатиінформаціюпроверсію 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Показатьинформациюоверсии 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"عرضمعلوماتالإصدار 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"संस्करणजानकारीदिखाएँ  0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"แสดงข้อมูลเวอร์ชัน 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"バージョン情報を表示 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"显示版本信息 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"顯示版本資訊 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"버전정보표시 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"0 הצגפרטיגרסה\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Afficherdesinformationssurlave 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Afișareinformațiidespreversiun 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Dangosgwybodaethyfersiwn 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Exibirinformaçõesdeversão 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Hiểnthịthôngtinphiênbản 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mostrainformazioniversione 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mostralainformaciódelaversió 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mostrarinformaçãodaversão 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Mostrarinformacióndeversión 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Näytäversiotiedot 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Perlihatkaninformasiversi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pokażinformacjeowersji 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Pokažiinformacijeorazličici 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Prikažiinformacijeoverziji 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Rodytiversijosinformaciją 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sürümbilgisinigöster 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Tunjukmaklumatversi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Versiegegevensweergeven 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Verzióinformációkmegjelenítése 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Visaversionsinformation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Visversionsinformation 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Zobrazitinformaceoverzi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Zobrazteinformácieoverzii 0\",\"index\":"
            ],
            user_logout: [
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"LogOut 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Abmelden 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Logkeluar 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Finalitzasessió 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Odhlásit 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Allgofnodi 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Logaf 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Cerrarsesión 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sedéconnecter 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Déconnexion 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Odjava 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Esci 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Atsijungti 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kijelentkezés 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Afmelden 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Loggav 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Wyloguj 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Encerrarasessão 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Sair 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Deconectare 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Odhlásiťsa 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Odjavise 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Odjavime 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Kirjauduulos 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Loggaut 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Đăngxuất 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ÇıkışYap 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Αποσύνδεση 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Отпишисе 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Выйти 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"Вийти 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"יציאה 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"تسجيلالخروج 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"लॉगआउटकरें 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ออกจากระบบ 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"로그아웃 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"ログアウト 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"注销 0\",\"index\":",
                "{\"selector\":\"A[role=\\\"option\\\"]\",\"text\":\"登出 0\",\"index\":"
            ]
        };

        const maps = [migrationMap1, migrationMap2];
        for (let j = 0, map; map = maps[j++];) {
            for (let i in map) {
                if (map.hasOwnProperty(i)) {
                    let m = map[i];
                    while (m) {
                        // set mid-point only for the last one. all others to the beginning
                        m.offset = m.shadow ? {x: 0.01, y: 0.01} : {x: 0.5, y: 0.5};
                        m = m.shadow;
                    }
                }
            }
        }

        for (let i in migrationMap1) {
            if (migrationMap1.hasOwnProperty(i)) {
                let i1 = '*[' + i.split('[')[1];
                migrationMap1_1[i1] = migrationMap1[i];
            }
        }

        function getTextMigration(selector) {
            for (let key in similarKeyMap) {
                if (similarKeyMap.hasOwnProperty(key)) {
                    for (let i = 0, s; s = similarKeyMap[key][i++];) {
                        if (selector.value.indexOf(s) >= 0) return migrationMap2[key];
                    }
                }
            }
            return null;
        }

        const pbsProto = Help4.service.recording.PlaybackService.prototype;
        const pbsFun = pbsProto.selectorToInfo;
        pbsProto.selectorToInfo = function(info) {  // {window, useOffset, selector}
            const pbs = Help4.getController().getService('playback');
            const s = info.selector;
            const m1 = migrationMap1[s.value] || migrationMap1_1[s.value];
            const m3 = migrationMap3[s.value] || migration3_1(s);

            if (m3 && s.rule === 'SFSF_StableIdSelector') {
                return pbsFun.call(pbs, info)
                .then(function(result) {
                    if (!result.window.exists || result.window.nodeName === 'XWEB-SHADOW-PROXY') {
                        s.value = m3.value;
                        s.offset = m3.offset;
                        s.shadow = m3.shadow;
                        return pbsFun.call(pbs, info);
                    }

                    return Help4.Promise.resolve(result);
                });
            } else if (m1 && s.rule === 'DataAttrSelector') {
                return pbsFun.call(pbs, info)
                .then(function(result) {
                    if (!result.window.exists || result.window.nodeName === 'XWEB-SHADOW-PROXY') {
                        s.value = m1.value;
                        s.offset = m1.offset;
                        s.shadow = m1.shadow;
                        return pbsFun.call(pbs, info);
                    }

                    return Help4.Promise.resolve(result);
                });
            } else if (s.rule === 'TextSelector') {
                const m2 = getTextMigration(s);
                if (m2) {
                    return pbsFun.call(pbs, info)
                    .then(function(result) {
                        if (!result.window.exists || result.window.nodeName === 'XWEB-SHADOW-PROXY') {
                            s.rule = 'DataAttrSelector';
                            s.value = m2.value;
                            s.offset = m2.offset;
                            s.shadow = m2.shadow;
                            return pbsFun.call(pbs, info);
                        }

                        return Help4.Promise.resolve(result);
                    });
                }
            }

            return pbsFun.call(pbs, info);
        }
    }

    (function initialize_web_assistant() {
        // check if sap framework already loaded - postpone if not
        if (!document.body || !window.sap?.ui?.getCore || !window.Help4) {
            window.setTimeout(initialize_web_assistant, 1000);
            return;
        }

        if (sap.ui.Device.system.phone) return;  // XRAY-2412

        // check if DOM already present - postpone if not
        if (!window.BizXHeaderController) {
            window.setTimeout(initialize_web_assistant, 1000);
            return;
        }

        Help4.selector.methods.DataAttrSelector.ATTRIBUTES.push('data-tourchipid');
        _shellHeaderMigration();

        // parse configuration
        try {
            cfg = Help4.JSON.parse(web_assistant_config);
        } catch (e) {
        }
        if (!cfg) return;

        // set some fallbacks
        if (!cfg.version) cfg.version = '1805';  // sfsfGuessVersion()
        if (!cfg.theme) {
            const theme = [...document.documentElement.classList].find(c => c.includes('sapUiTheme'))?.replace('sapUiTheme-', '');
            cfg.theme = theme_map[theme] || 'horizon';
        }

        for (const key in cfg) {
            if (cfg.hasOwnProperty(key) && typeof cfg[key] === 'string') {
                cfg[key] = cfg[key].trim();
            }
        }

        const {pageInfo: pi} = window.pageHeaderJsonData;
        screen_ids.push(pi ? [pi.moduleId, pi.pageId, pi.pageQualifier].join('/') : 'unknown');

        const config = sap.ui.getCore().getConfiguration();
        const loc = config.getLocale();
        const region = loc.getRegion();
        const lang = loc.getLanguage() + (region ? '-' + region : '');

        // hard-wire some parameters
        Help4.extendObject(cfg, {
            type: 'generic',
            buttonId: btn_id,
            whatsNewDirect: cfg.show_whatsnew_direct,
            multipage: true,
            appName: removeZeroWidthSpaceCharacters(screen_ids[0]),
            language: lang,
            rtl: config.getRTL(),
            solution: 'sfsf',

            onHelpAvailable: function(bAvailable) {
                if (!!BizXHeaderController.addShellbarItem) {  // XRAY-3881: is UI5 Web Components available
                    BizXHeaderController.updateShellbarItem({id: btn_id, visible: bAvailable});
                } else if (oHelpBtn) {
                    oHelpBtn.setVisible(bAvailable);
                }
            },

            onHelpRequireIndent: updateIndent,

            onHelpBusy: function(busy) {},
            onHelpMinimized: function(bMinimized) {},
            onHelpMode: function(mode) {},
            onHelpActive: function(bActive) {},
            onHelpCarousel: function(bExists) {},

            selector: {
                blacklist: [],
                rules: [
                    'DataAttrSelector',
                    'ClassSelector',
                    'SFSF_StableIdSelector',
                    'SFSF_XmlViewSelector',
                    'SFSF_MsgsSelector',
                    'SFSF_FormFieldSelector',
                    'TextSelector',
                    'SFSF_FormNameSelector',
                    'GenericSelector:sfsf'
                ],
                selectors: {}
            }
        });

        const dataUrlWPB = typeof cfg.dataUrlWPB === 'string'
            ? cfg.dataUrlWPB.replace(/\/pub\//, "/wa/")
            : null;

        if (cfg.enableStandardContent) {
            cfg.serviceLayerVersion = 'UACP';
            cfg.dataUrlUACP = 'https://help.sap.com/webassistant/';

            if (cfg.enableCustomContent) {
                cfg.serviceLayerVersion = 'EXT';
                cfg.roModel = 'UACP';
                if (!(cfg.dataUrlWPB2 = dataUrlWPB)) return;
            }
        } else {
            cfg.serviceLayerVersion = 'WPB';
            if (!(cfg.dataUrlWPB = dataUrlWPB)) return;
        }

        const isWC = !!BizXHeaderController.addShellbarItem;  // XRAY-3881: is UI5 Web Components available

        if (!isWC) {
            // create the button and insert it
            oHelpBtn = new sap.sf.surj.shell.controls.BizXButton({
                //BizXButton is a wrapper class of SAPUI5 header. You could use any sap.m.Button APIs.
                id: btn_id,
                tooltip: Help4.Localization.getText('tooltip.fiorihelp'),
                icon: 'sap-icon://sys-help',
                customData: new sap.ui.core.CustomData({
                    key: 'help-id',
                    value: 'enaWebAssistantHelpButton',
                    writeToDom: true
                })
            });

            (function _setButtonAttribute() {
                const sel = oHelpBtn.$();
                if (sel) {
                    sel.attr('aria-label', Help4.Localization.getText('tooltip.fiorihelp'));
                } else {
                    setTimeout(_setButtonAttribute, 500);
                }
            })();
        }

        (function startWithButton() {
            if (isWC || document.getElementById(btn_id)) {
                // button ready: init Web Assistant

                Help4.init(cfg, true)
                .then(function(wa) {
                    if (window.WebAssistant = wa) {
                        if (isWC) {
                            // XRAY-3881: UI5 Web Components. Not possible to give press afterwards
                            // create button after initialization
                            BizXHeaderController.addShellbarItem({
                                id: btn_id,
                                icon: 'sap-icon://sys-help',
                                title: Help4.Localization.getText('tooltip.fiorihelp'),
                                helpId: 'enaWebAssistantHelpButton',
                                visible: false,
                                press: wa.toggle.bind(wa)
                            });
                        } else {
                            oHelpBtn.attachPress(wa.toggle.bind(wa));
                        }
                    }

                    const checkIgnored = uid => !ignored_ids.includes(uid);

                    if (window.userAssistanceUtil && userAssistanceUtil.enableWebAssistantForPopup) {  // Popup support: XRAY-1672
                        userAssistanceUtil.enableWebAssistantForPopup(
                            function(uid) {  // onPopupOpen
                                uid = uid.replace(/ /g, '');

                                // XRAY-5936: ignore session timeout dialog
                                if (wa && uid && checkIgnored(uid)) {
                                    screen_ids.push(uid);
                                    wa.setAppName(removeZeroWidthSpaceCharacters(screen_ids));
                                }
                            },
                            function(uid) {  // onPopupClose
                                uid = uid.replace(/ /g, '');
                                // XRAY-5936: ignore session timeout dialog
                                if (wa && uid && checkIgnored(uid)) {
                                    const x = screen_ids.lastIndexOf(uid);
                                    if (x >= 0) {
                                        screen_ids.splice(x, screen_ids.length - x);
                                        wa.setAppName(removeZeroWidthSpaceCharacters(screen_ids));
                                    } else {  // XRAY-2584
                                        if (window.console) console.warn('Web Assistant - OnPopupClose: unknown popup id "' + uid + '"');

                                        if (screen_ids.length > 1) {
                                            screen_ids.pop();
                                            wa.setAppName(removeZeroWidthSpaceCharacters(screen_ids));
                                        }
                                    }
                                }
                            },
                            function() { // onPopupHelp
                                if (wa) wa.toggle();
                            }
                        );
                    }
                });
            } else {
                // check if DOM already present - postpone if not
                const oCustomHeader = sap.ui.getCore().byId('bizXShellCustomHeader');
                if (!oCustomHeader) {
                    setTimeout(startWithButton, 500);
                    return;
                }
                // XRAY-1773: in EDGE the button is within the custom header but not displayed
                // remove and insert it again and again until it is shown by the custom header control
                oCustomHeader.removeContentRight(btn_id);
                oCustomHeader.insertContentRight(oHelpBtn, 2);
                setTimeout(startWithButton, 500);
            }
        })();
    })();
})();

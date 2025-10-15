/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fare_vault.json`.
 */
export type FareVault = {
    address: "FAREvmepkHArRWwLjHmwPQGL9Byg8iKF3hu1vewxTSXe";
    metadata: {
      name: "fareVault";
      version: "0.1.0";
      spec: "0.1.0";
      description: "Created with Anchor";
    };
    instructions: [
      {
        name: "initialize";
        discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
        accounts: [
          {
            name: "payer";
            writable: true;
            signer: true;
          },
          {
            name: "vaultState";
            writable: true;
            pda: {
              seeds: [
                {
                  kind: "const";
                  value: [118, 97, 117, 108, 116, 95, 115, 116, 97, 116, 101];
                }
              ];
            };
          },
          {
            name: "systemProgram";
            address: "11111111111111111111111111111111";
          }
        ];
        args: [
          {
            name: "vs";
            type: {
              defined: {
                name: "vaultState";
              };
            };
          }
        ];
      },
      {
        name: "poolRegister";
        discriminator: [46, 254, 199, 174, 177, 152, 139, 204];
        accounts: [
          {
            name: "payer";
            writable: true;
            signer: true;
          },
          {
            name: "pool";
            writable: true;
            signer: true;
          },
          {
            name: "systemProgram";
            address: "11111111111111111111111111111111";
          }
        ];
        args: [
          {
            name: "pc";
            type: {
              defined: {
                name: "poolConfig";
              };
            };
          }
        ];
      },
      {
        name: "trialRegister";
        discriminator: [212, 33, 155, 17, 177, 86, 161, 221];
        accounts: [
          {
            name: "vaultState";
            writable: true;
            pda: {
              seeds: [
                {
                  kind: "const";
                  value: [118, 97, 117, 108, 116, 95, 115, 116, 97, 116, 101];
                }
              ];
            };
          },
          {
            name: "payer";
            writable: true;
            signer: true;
          },
          {
            name: "trial";
            writable: true;
            signer: true;
          },
          {
            name: "pool";
            writable: true;
          },
          {
            name: "netToken";
            writable: true;
          },
          {
            name: "hostToken";
            writable: true;
          },
          {
            name: "mint";
            writable: true;
          },
          {
            name: "payerToken";
            writable: true;
          },
          {
            name: "tokenProgram";
          },
          {
            name: "systemProgram";
            address: "11111111111111111111111111111111";
          }
        ];
        args: [
          {
            name: "qkActual";
            type: {
              defined: {
                name: "qk";
              };
            };
          },
          {
            name: "mult";
            type: "f64";
          },
          {
            name: "extraDataHash";
            type: "string";
          }
        ];
      },
      {
        name: "trialResolveRand";
        discriminator: [130, 235, 124, 151, 81, 25, 16, 192];
        accounts: [
          {
            name: "user";
            writable: true;
          },
          {
            name: "vaultState";
            writable: true;
            pda: {
              seeds: [
                {
                  kind: "const";
                  value: [118, 97, 117, 108, 116, 95, 115, 116, 97, 116, 101];
                }
              ];
            };
          },
          {
            name: "trial";
            writable: true;
          },
          {
            name: "pool";
            writable: true;
          },
          {
            name: "netToken";
            writable: true;
          },
          {
            name: "hostToken";
            writable: true;
          },
          {
            name: "mint";
            writable: true;
          },
          {
            name: "userToken";
            writable: true;
          },
          {
            name: "multisigAuthority";
          },
          {
            name: "vaultMintSigner";
            pda: {
              seeds: [
                {
                  kind: "const";
                  value: [
                    118,
                    97,
                    117,
                    108,
                    116,
                    95,
                    109,
                    105,
                    110,
                    116,
                    95,
                    115,
                    105,
                    103,
                    110,
                    101,
                    114
                  ];
                }
              ];
            };
          },
          {
            name: "tokenProgram";
          },
          {
            name: "resolver";
            writable: true;
            signer: true;
          }
        ];
        args: [
          {
            name: "randomness";
            type: {
              array: ["u8", 64];
            };
          }
        ];
      },
      {
        name: "updateVaultState";
        discriminator: [6, 239, 235, 198, 248, 227, 17, 41];
        accounts: [
          {
            name: "admin";
            signer: true;
          },
          {
            name: "vaultState";
            writable: true;
            pda: {
              seeds: [
                {
                  kind: "const";
                  value: [118, 97, 117, 108, 116, 95, 115, 116, 97, 116, 101];
                }
              ];
            };
          }
        ];
        args: [
          {
            name: "vs";
            type: {
              defined: {
                name: "vaultState";
              };
            };
          }
        ];
      }
    ];
    accounts: [
      {
        name: "poolState";
        discriminator: [247, 237, 227, 245, 215, 195, 222, 70];
      },
      {
        name: "trialState";
        discriminator: [80, 243, 182, 13, 235, 252, 194, 115];
      },
      {
        name: "vaultState";
        discriminator: [228, 196, 82, 165, 98, 210, 235, 152];
      }
    ];
    events: [
      {
        name: "adminAddressUpdated";
        discriminator: [41, 190, 38, 144, 198, 155, 88, 201];
      },
      {
        name: "evThresholdUpdated";
        discriminator: [21, 2, 227, 23, 107, 87, 123, 194];
      },
      {
        name: "feeCharged";
        discriminator: [10, 15, 44, 253, 165, 0, 86, 248];
      },
      {
        name: "feeNetworkPercentUpdated";
        discriminator: [189, 92, 88, 176, 214, 84, 9, 234];
      },
      {
        name: "minimumFeeBurnPercentUpdated";
        discriminator: [177, 53, 222, 10, 101, 156, 20, 76];
      },
      {
        name: "networkFeeRecipientAddressUpdated";
        discriminator: [187, 173, 27, 83, 231, 21, 17, 173];
      },
      {
        name: "poolAccumulatedAmountReleased";
        discriminator: [24, 220, 55, 231, 249, 157, 219, 208];
      },
      {
        name: "poolAccumulatedAmountUpdated";
        discriminator: [200, 54, 121, 99, 14, 180, 19, 138];
      },
      {
        name: "poolRegistered";
        discriminator: [77, 114, 165, 230, 33, 230, 135, 215];
      },
      {
        name: "resolverAddressUpdated";
        discriminator: [23, 231, 0, 252, 138, 48, 163, 241];
      },
      {
        name: "trialRegistered";
        discriminator: [182, 0, 212, 203, 142, 87, 214, 221];
      },
      {
        name: "trialResolved";
        discriminator: [196, 198, 203, 60, 5, 136, 167, 206];
      }
    ];
    errors: [
      {
        code: 6000;
        name: "invalidEv";
        msg: "Invalid EV Threshold";
      },
      {
        code: 6001;
        name: "invalidFeeNetworkPct";
        msg: "Invalid Fee Network Pct";
      },
      {
        code: 6002;
        name: "invalidMinFeeBurnPct";
        msg: "Invalid Min Fee Burn Pct";
      },
      {
        code: 6003;
        name: "invalidNetworkFees";
        msg: "Invalid total Network fees";
      },
      {
        code: 6004;
        name: "invalidFeeHostPct";
        msg: "Invalid Fee Host Pct";
      },
      {
        code: 6005;
        name: "invalidFeePoolPct";
        msg: "Invalid Fee Pool Pct";
      },
      {
        code: 6006;
        name: "invalidHostFees";
        msg: "Invalid total Host fees";
      },
      {
        code: 6007;
        name: "invalidPoolProbability";
        msg: "Invalid pool probability";
      },
      {
        code: 6008;
        name: "invalidMultiplier";
        msg: "The multiplier must be positive";
      },
      {
        code: 6009;
        name: "invalidFeePercentSum";
        msg: "Sum of fee percents exceed 1";
      },
      {
        code: 6010;
        name: "invalidK";
        msg: "Invalid K";
      },
      {
        code: 6011;
        name: "invalidQ";
        msg: "Invalid Q";
      },
      {
        code: 6012;
        name: "invalidQSum";
        msg: "Invalid Q sum";
      },
      {
        code: 6013;
        name: "evTooHigh";
        msg: "The expected value is too high";
      },
      {
        code: 6014;
        name: "invalidMultisigAuthority";
        msg: "Invalid multisig authority";
      },
      {
        code: 6015;
        name: "impossible";
        msg: "Impossible error";
      },
      {
        code: 6016;
        name: "overflow";
        msg: "Overflow occured";
      }
    ];
    types: [
      {
        name: "adminAddressUpdated";
        type: {
          kind: "struct";
          fields: [
            {
              name: "newAdmin";
              type: "pubkey";
            }
          ];
        };
      },
      {
        name: "evThresholdUpdated";
        type: {
          kind: "struct";
          fields: [
            {
              name: "newEvThreshold";
              type: "f64";
            }
          ];
        };
      },
      {
        name: "feeCharged";
        type: {
          kind: "struct";
          fields: [
            {
              name: "feeType";
              type: "u8";
            },
            {
              name: "poolId";
              type: "pubkey";
            },
            {
              name: "trialId";
              type: "pubkey";
            },
            {
              name: "feeAmount";
              type: "u64";
            }
          ];
        };
      },
      {
        name: "feeNetworkPercentUpdated";
        type: {
          kind: "struct";
          fields: [
            {
              name: "newFeeNetworkPercent";
              type: "f64";
            }
          ];
        };
      },
      {
        name: "minimumFeeBurnPercentUpdated";
        type: {
          kind: "struct";
          fields: [
            {
              name: "newMinimumFeeBurnPercent";
              type: "f64";
            }
          ];
        };
      },
      {
        name: "networkFeeRecipientAddressUpdated";
        type: {
          kind: "struct";
          fields: [
            {
              name: "newNetworkFeeReceipient";
              type: "pubkey";
            }
          ];
        };
      },
      {
        name: "poolAccumulatedAmountReleased";
        type: {
          kind: "struct";
          fields: [
            {
              name: "poolId";
              type: "pubkey";
            },
            {
              name: "trialId";
              type: "pubkey";
            },
            {
              name: "receiver";
              type: "pubkey";
            },
            {
              name: "releasedAmount";
              type: "u64";
            }
          ];
        };
      },
      {
        name: "poolAccumulatedAmountUpdated";
        type: {
          kind: "struct";
          fields: [
            {
              name: "poolId";
              type: "pubkey";
            },
            {
              name: "trialId";
              type: "pubkey";
            },
            {
              name: "newAccumulatedAmount";
              type: "u64";
            }
          ];
        };
      },
      {
        name: "poolConfig";
        type: {
          kind: "struct";
          fields: [
            {
              name: "manager";
              type: "pubkey";
            },
            {
              name: "feePlayMul";
              type: "f64";
            },
            {
              name: "feeLossMul";
              type: "f64";
            },
            {
              name: "feeMintMul";
              type: "f64";
            },
            {
              name: "feeHostPct";
              type: "f64";
            },
            {
              name: "feePoolPct";
              type: "f64";
            },
            {
              name: "probability";
              type: "f64";
            },
            {
              name: "minLimitForTicket";
              type: "f64";
            }
          ];
        };
      },
      {
        name: "poolRegistered";
        type: {
          kind: "struct";
          fields: [
            {
              name: "poolId";
              type: "pubkey";
            },
            {
              name: "managerAddress";
              type: "pubkey";
            },
            {
              name: "feePlayMultiplier";
              type: "f64";
            },
            {
              name: "feeLossMultiplier";
              type: "f64";
            },
            {
              name: "feeMintMultiplier";
              type: "f64";
            },
            {
              name: "feeHostPercent";
              type: "f64";
            },
            {
              name: "feePoolPercent";
              type: "f64";
            },
            {
              name: "minLimitForTicket";
              type: "f64";
            },
            {
              name: "probability";
              type: "f64";
            }
          ];
        };
      },
      {
        name: "poolState";
        type: {
          kind: "struct";
          fields: [
            {
              name: "config";
              type: {
                defined: {
                  name: "poolConfig";
                };
              };
            },
            {
              name: "accum";
              type: "u64";
            }
          ];
        };
      },
      {
        name: "qk";
        type: {
          kind: "struct";
          fields: [
            {
              vec: {
                array: ["f64", 2];
              };
            }
          ];
        };
      },
      {
        name: "resolverAddressUpdated";
        type: {
          kind: "struct";
          fields: [
            {
              name: "newResolver";
              type: "pubkey";
            }
          ];
        };
      },
      {
        name: "trialRegistered";
        type: {
          kind: "struct";
          fields: [
            {
              name: "trialId";
              type: "pubkey";
            },
            {
              name: "who";
              type: "pubkey";
            },
            {
              name: "poolId";
              type: "pubkey";
            },
            {
              name: "multiplier";
              type: "u64";
            },
            {
              name: "qk";
              type: {
                defined: {
                  name: "qk";
                };
              };
            },
            {
              name: "extraDataHash";
              type: "string";
            }
          ];
        };
      },
      {
        name: "trialResolved";
        type: {
          kind: "struct";
          fields: [
            {
              name: "trialId";
              type: "pubkey";
            },
            {
              name: "resultIndex";
              type: "u64";
            },
            {
              name: "randomness";
              type: "f64";
            }
          ];
        };
      },
      {
        name: "trialState";
        type: {
          kind: "struct";
          fields: [
            {
              name: "qk";
              type: {
                defined: {
                  name: "qk";
                };
              };
            },
            {
              name: "mult";
              type: "u64";
            },
            {
              name: "user";
              type: "pubkey";
            },
            {
              name: "userToken";
              type: "pubkey";
            },
            {
              name: "poolId";
              type: "pubkey";
            },
            {
              name: "extraDataHash";
              type: "string";
            },
            {
              name: "feeNetworkPct";
              type: "f64";
            }
          ];
        };
      },
      {
        name: "vaultState";
        type: {
          kind: "struct";
          fields: [
            {
              name: "evThreshold";
              type: "f64";
            },
            {
              name: "admin";
              type: "pubkey";
            },
            {
              name: "resolver";
              type: "pubkey";
            },
            {
              name: "netFeeRecipient";
              type: "pubkey";
            },
            {
              name: "feeNetworkPct";
              type: "f64";
            },
            {
              name: "minFeeBurnPct";
              type: "f64";
            }
          ];
        };
      }
    ];
  };
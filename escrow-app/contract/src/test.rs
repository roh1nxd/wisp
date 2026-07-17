#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation};
use soroban_sdk::{token, Address, Env};

#[test]
fn test_successful_release() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    
    // Register token contract
    let token_admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = token::Client::new(&env, &token_contract_id);

    let amount = 1000i128;

    // Initialize escrow
    client.initialize(&buyer, &seller, &token_contract_id, &amount);

    // Mint token balance to contract representing deposit
    let sac_admin_client = token::StellarAssetContractClient::new(&env, &token_contract_id);
    sac_admin_client.mint(&contract_id, &amount);

    assert_eq!(token_client.balance(&contract_id), amount);
    assert_eq!(token_client.balance(&seller), 0);

    // Buyer releases the escrow
    client.release();

    // Verify authentication verification
    assert_eq!(
        env.auths(),
        std::vec![(
            buyer.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    contract_id.clone(),
                    soroban_sdk::symbol_short!("release"),
                    std::vec![&env]
                )),
                sub_invocations: std::vec![]
            }
        )]
    );

    // Verify token transfer succeeded
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&seller), amount);
}

#[test]
#[should_panic]
fn test_unauthorized_release() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract(token_admin.clone());

    client.initialize(&buyer, &seller, &token_contract_id, &1000);

    // Simulate calling the release without mocking buyer's auth
    // This call should panic due to missing authentication from the buyer address
    client.release();
}

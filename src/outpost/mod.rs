use arc_swap::ArcSwap;
use authentik_client::apis::configuration::Configuration;
use authentik_client::models::outpost::Outpost as ApiOutpost;
use eyre::Result;

#[cfg(feature = "proxy")]
mod proxy;

trait Outpost {
    fn new() -> Result<impl Outpost>;

    fn refresh(&self, api_config: &Configuration) -> Result<()>;
}

struct Controller<O> {
    outpost: O,
}

// impl<O> Controller<O>
// where
//     O: Outpost,
// {
//     fn new() -> Result<Self> {
//         let outpost = O::new()?;
//
//         Ok(Self { outpost })
//     }
// }

#!/bin/sh
# build 0042: bakes every character model from the free CC0 Quaternius packs (Modular Character Outfits - Fantasy,
# Universal Base Characters, Universal Animation Library). usage: sh tools/model/characters.sh <folder with the unpacked packs> <UAL1_Standard.glb>
set -e
K="$1"; UAL="$2"; OUT=public/models
O="$K/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits"
B="$K/Universal Base Characters[Standard]/Base Characters/Godot - UE"
H="$K/Universal Base Characters[Standard]/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)"
M="$B/Superhero_Male_FullBody.gltf@bones=Head,neck_01"; F="$B/Superhero_Female_FullBody.gltf@bones=Head,neck_01"
LEGS="thigh_l,calf_l,foot_l,ball_l,ball_leaf_l,thigh_r,calf_r,foot_r,ball_r,ball_leaf_r"
C="--meshonly 1 --attach hand_r,hand_l,Head,spine_03 --sat .4 --cluster .012"
node tools/model/anims.mjs $OUT/anims.cdl --anims "$UAL" --fps 20 --keep Idle_Loop=idle,Walk_Loop=walk,Jog_Fwd_Loop=run,Sword_Attack=attack,Death01=die,Roll=roll,Hit_Chest=hit,Spell_Simple_Shoot=cast,Punch_Cross=punch,Punch_Jab=jab,Idle_Talking_Loop=talk
# Ranger: hooded ranger outfit
node tools/model/build.mjs $OUT/ranger.cdm --mesh "$O/Male_Ranger.gltf" --mesh "$M" $C --kinds 'Boots|Bracer|Belt|Pauldron=leather'
# Warden: the ranger cut turned to steel (chest, shoulder guard, bracers, boots), dark red under-cloth, a beard; helmet and shield are added in game
node tools/model/build.mjs $OUT/warden.cdm --mesh "$O/Male_Ranger.gltf" --mesh "$M" --mesh "$H/Hair_Beard.gltf" $C --drop 'Hood' \
  --kinds 'Belt=leather,Body|Pauldron|Bracer|Boots=metal' --tint 'Belt=3a2a1e:.5,Body|Pauldron|Bracer|Boots=8e97a8:.85,Legs=5a2420:.75,Arms.*MI_Ranger=3c4250:.7'
# Arcanist: long robe-like peasant dress dyed violet, silver long hair; pointed hat added in game
node tools/model/build.mjs $OUT/arcanist.cdm --mesh "$O/Female_Peasant.gltf" --mesh "$F" --mesh "$H/Hair_Long.gltf" $C \
  --kinds 'Feet=leather' --tint 'Peasant_Body|Peasant_Arms=5a46a0:.85,Legs=2c2448:.85,Feet=2a2030:.6,Hair_Long=b4b0c4:.8'
# Elementalist: the women's ranger outfit dyed ember red, hood up, glowing trim on the shoulders
node tools/model/build.mjs $OUT/elementalist.cdm --mesh "$O/Female_Ranger.gltf" --mesh "$F" $C \
  --kinds 'Feet|Bracer|Belt=leather' --tint 'Belt=3a2218:.5,Pauldron=d8782c:.6,Hood|Body=8a2c1e:.85,Legs=4c1c14:.8,Arms.*MI_Ranger=6a2418:.7'
# Brawler: bare-chested fighter, peasant trousers, buzzed hair and beard
node tools/model/build.mjs $OUT/brawler.cdm --mesh "$B/Superhero_Male_FullBody.gltf@nobones=$LEGS" --mesh "$O/Male_Peasant.gltf@nodes=Male_Peasant_Legs,Male_Peasant_Feet" --mesh "$H/Hair_Buzzed.gltf" --mesh "$H/Hair_Beard.gltf" $C \
  --kinds 'Feet=leather' --tint 'Legs=3a2a22:.75,Feet=2a2018:.6'
# Town folk: plain peasant clothes left grey so each villager can be dyed in game; two hairstyles and a beard each can be shown or hidden
node tools/model/build.mjs $OUT/folkm.cdm --mesh "$O/Male_Peasant.gltf" --mesh "$M" --mesh "$H/Hair_SimpleParted.gltf" --mesh "$H/Hair_Buzzed.gltf" --mesh "$H/Hair_Beard.gltf" $C \
  --kinds 'Buzzed=hairb,Beard=beard,Legs|Feet=leather' --tint 'Peasant_(Body|Arms).*MI_Peasant=a8a8a8:.9'
node tools/model/build.mjs $OUT/folkf.cdm --mesh "$O/Female_Peasant.gltf" --mesh "$F" --mesh "$H/Hair_Buns.gltf" --mesh "$H/Hair_Long.gltf" $C \
  --kinds 'Hair_Long=hairb,Legs|Feet=leather' --tint 'Peasant_(Body|Arms).*MI_Peasant=a8a8a8:.9'

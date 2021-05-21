HOME=$(dirname $0)

destination=./src/translation/tr.json

translations="en_US SKIP SKIP ar ast bg bn_BN ca cs_CZ da_DK de_DE el eo es fa fil fi fr_FR fr_CH gl he hr_HR hsb hu_HU in_ID it ja ko lt_LT ne nl pl_PL pt_BR pt_PT ro ru sk sl_SI sr_RS sv_SE tr uk vi_VN zh_CN zh_HK zh_TW"

file=/tmp/tmp.tsv

curl -L 'https://docs.google.com/spreadsheets/d/10HKSFmxGVEIO92loVQetVmjXT0qpf3EA2jxuQSSYTdU/export?format=tsv&id=10HKSFmxGVEIO92loVQetVmjXT0qpf3EA2jxuQSSYTdU&gid=0' | tail -n+5 > $file

echo '{' > $destination

INDEX=1
for tr in $translations; do
  INDEX=$(($INDEX + 1))
  if [[ "$tr" == "SKIP" ]]; then
    continue
  fi
  echo "\"$tr\":{" >> $destination
  while IFS=$'\r' read -r line; do
    VAL=$(echo "$line" | cut -f1,$INDEX --output-delimiter="\":\"")
    if [[ $VAL = web.* ]]; then
      VAL=${VAL#"web."}
      echo "\"$VAL\"," >> $destination
    fi
  done < $file
  echo "}," >> $destination
  
done

echo "}" >> $destination

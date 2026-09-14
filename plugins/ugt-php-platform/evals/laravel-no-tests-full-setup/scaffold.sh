# copy the case fixture/ into the run cwd — $0 is the script path (Windows or POSIX form)
here="$(dirname "${0//\\//}")"
cp -r "$here/fixture/." .
